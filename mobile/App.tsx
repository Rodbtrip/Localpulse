import React, { useEffect, useState } from 'react';
import { NavigationContainer, DefaultTheme } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { StatusBar } from 'expo-status-bar';
import { Text, View } from 'react-native';
import { useFonts, SpaceGrotesk_600SemiBold, SpaceGrotesk_700Bold } from '@expo-google-fonts/space-grotesk';
import { Inter_400Regular, Inter_500Medium, Inter_600SemiBold, Inter_700Bold } from '@expo-google-fonts/inter';
import { JetBrainsMono_600SemiBold } from '@expo-google-fonts/jetbrains-mono';
import { Session } from '@supabase/supabase-js';

import { supabase } from './lib/supabase';
import { ensureProfile, getMyRole } from './lib/api';
import { colors, fonts } from './lib/theme';
import RoleSelectScreen from './screens/auth/RoleSelectScreen';
import SignInScreen from './screens/auth/SignInScreen';
import SignUpScreen from './screens/auth/SignUpScreen';
import ExploreScreen from './screens/customer/ExploreScreen';
import MyOffersScreen from './screens/customer/MyOffersScreen';
import ShopDetailScreen from './screens/customer/ShopDetailScreen';
import OwnerOverviewScreen from './screens/owner/OverviewScreen';
import BusinessProfileScreen from './screens/owner/BusinessProfileScreen';
import PromotionsScreen from './screens/owner/PromotionsScreen';
import SuggestionsScreen from './screens/owner/SuggestionsScreen';
import RedeemScreen from './screens/owner/RedeemScreen';
import ReferralsScreen from './screens/owner/ReferralsScreen';
import BillingScreen from './screens/owner/BillingScreen';
import MoreMenuScreen from './screens/owner/MoreMenuScreen';
import LegalScreen, { legalTitle } from './screens/shared/LegalScreen';

export type AuthStackParams = {
  RoleSelect: undefined;
  SignIn: { role: 'owner' | 'customer' };
  SignUp: { role: 'owner' | 'customer' };
  Legal: { doc: 'terms' | 'privacy' | 'contest' };
};

export type CustomerStackParams = {
  Explore: undefined;
  ShopDetail: { shopId: string; shopName: string };
  Legal: { doc: 'terms' | 'privacy' | 'contest' };
};

const AuthStack = createNativeStackNavigator<AuthStackParams>();
const CustomerStack = createNativeStackNavigator<CustomerStackParams>();
const CustomerTabs = createBottomTabNavigator();
const OwnerTabs = createBottomTabNavigator();
const OwnerMoreStack = createNativeStackNavigator();

const navTheme = {
  ...DefaultTheme,
  colors: { ...DefaultTheme.colors, background: colors.paper, primary: colors.coral },
};

const headerStyle = {
  headerStyle: { backgroundColor: colors.paper },
  headerShadowVisible: false,
  headerTitleStyle: { fontFamily: fonts.display, color: colors.ink },
  headerTintColor: colors.coral,
} as const;

function ExploreFlow() {
  return (
    <CustomerStack.Navigator screenOptions={headerStyle}>
      <CustomerStack.Screen name="Explore" component={ExploreScreen} options={{ headerShown: false }} />
      <CustomerStack.Screen
        name="ShopDetail"
        component={ShopDetailScreen}
        options={({ route }) => ({ title: route.params.shopName })}
      />
      <CustomerStack.Screen
        name="Legal"
        component={LegalScreen as any}
        options={({ route }) => ({ title: legalTitle((route.params as any).doc) })}
      />
    </CustomerStack.Navigator>
  );
}

function CustomerApp() {
  return (
    <CustomerTabs.Navigator
      screenOptions={{
        headerShown: false,
        tabBarStyle: { backgroundColor: colors.navy, borderTopColor: colors.navy, height: 62, paddingTop: 6 },
        tabBarIcon: () => null,
        tabBarLabelPosition: 'below-icon',
      }}
    >
      <CustomerTabs.Screen
        name="Nearby"
        component={ExploreFlow}
        options={{ tabBarLabel: (p) => <TabLabel label="Nearby" focused={p.focused} /> }}
      />
      <CustomerTabs.Screen
        name="MyOffers"
        component={MyOffersScreen}
        options={{ tabBarLabel: (p) => <TabLabel label="My offers" focused={p.focused} /> }}
      />
    </CustomerTabs.Navigator>
  );
}

function OwnerMore() {
  return (
    <OwnerMoreStack.Navigator screenOptions={headerStyle}>
      <OwnerMoreStack.Screen name="MoreMenu" component={MoreMenuScreen} options={{ title: 'More' }} />
      <OwnerMoreStack.Screen name="Referrals" component={ReferralsScreen} />
      <OwnerMoreStack.Screen name="Billing" component={BillingScreen} />
      <OwnerMoreStack.Screen
        name="Legal"
        component={LegalScreen as any}
        options={({ route }) => ({ title: legalTitle((route.params as any).doc) })}
      />
    </OwnerMoreStack.Navigator>
  );
}

function TabLabel({ label, focused }: { label: string; focused: boolean }) {
  return (
    <Text
      style={{
        fontFamily: focused ? fonts.bodySemi : fonts.bodyMedium,
        fontSize: 10.5,
        color: focused ? colors.coral : colors.inkFaint,
      }}
    >
      {label}
    </Text>
  );
}

function OwnerApp() {
  return (
    <OwnerTabs.Navigator
      screenOptions={{
        ...headerStyle,
        tabBarStyle: { backgroundColor: colors.navy, borderTopColor: colors.navy, height: 62, paddingTop: 6 },
        tabBarIcon: () => null,
        tabBarLabelPosition: 'below-icon',
      }}
    >
      <OwnerTabs.Screen
        name="Overview"
        component={OwnerOverviewScreen}
        options={{ headerShown: false, tabBarLabel: (p) => <TabLabel label="Overview" focused={p.focused} /> }}
      />
      <OwnerTabs.Screen
        name="Promotions"
        component={PromotionsScreen}
        options={{ tabBarLabel: (p) => <TabLabel label="Promotions" focused={p.focused} /> }}
      />
      <OwnerTabs.Screen
        name="Deal Contest"
        component={SuggestionsScreen}
        options={{ tabBarLabel: (p) => <TabLabel label="Contest" focused={p.focused} /> }}
      />
      <OwnerTabs.Screen
        name="Redeem"
        component={RedeemScreen}
        options={{ tabBarLabel: (p) => <TabLabel label="Redeem" focused={p.focused} /> }}
      />
      <OwnerTabs.Screen
        name="Profile"
        component={BusinessProfileScreen}
        options={{ title: 'Business profile', tabBarLabel: (p) => <TabLabel label="Profile" focused={p.focused} /> }}
      />
      <OwnerTabs.Screen
        name="More"
        component={OwnerMore}
        options={{ headerShown: false, tabBarLabel: (p) => <TabLabel label="More" focused={p.focused} /> }}
      />
    </OwnerTabs.Navigator>
  );
}

export default function App() {
  const [fontsLoaded] = useFonts({
    SpaceGrotesk_600SemiBold,
    SpaceGrotesk_700Bold,
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
    JetBrainsMono_600SemiBold,
  });
  const [session, setSession] = useState<Session | null>(null);
  const [role, setRole] = useState<'owner' | 'customer'>('customer');
  const [ready, setReady] = useState(false);

  useEffect(() => {
    async function resolve(s: Session | null) {
      setSession(s);
      if (s) {
        // Heal any account whose profiles row is missing, then read the
        // role from profiles — the same source of truth the web uses.
        await ensureProfile().catch(() => {});
        setRole(await getMyRole().catch(() => 'customer' as const));
      }
      setReady(true);
    }
    supabase.auth.getSession().then(({ data }) => resolve(data.session));
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => {
      resolve(s);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  if (!fontsLoaded || !ready) {
    return <View style={{ flex: 1, backgroundColor: colors.navy }} />;
  }

  return (
    <NavigationContainer theme={navTheme}>
      <StatusBar style="dark" backgroundColor={colors.paper} />
      {!session ? (
        <AuthStack.Navigator screenOptions={{ headerShown: false }}>
          <AuthStack.Screen name="RoleSelect" component={RoleSelectScreen} />
          <AuthStack.Screen name="SignIn" component={SignInScreen} />
          <AuthStack.Screen name="SignUp" component={SignUpScreen} />
          <AuthStack.Screen
            name="Legal"
            component={LegalScreen as any}
            options={({ route }) => ({
              headerShown: true,
              ...headerStyle,
              title: legalTitle((route.params as any).doc),
            })}
          />
        </AuthStack.Navigator>
      ) : role === 'owner' ? (
        <OwnerApp />
      ) : (
        <CustomerApp />
      )}
    </NavigationContainer>
  );
}
