import { ClerkProvider, useAuth, useClerk } from '@clerk/expo';
import { tokenCache } from '@clerk/expo/token-cache';
import { ConvexReactClient, useConvexAuth } from 'convex/react';
import { ConvexProviderWithClerk } from 'convex/react-clerk';
import { QueryClientProvider } from '@tanstack/react-query';
import { useEffect, useState, type PropsWithChildren } from 'react';
import { ActivityIndicator, Button, Text, View } from 'react-native';
import { SessionContext } from '@/contexts/session-context';
import { createQueryClient } from '@/lib/query-client';
import { SessionScope } from '@/lib/session-scope';
import { clearDeviceReminders } from '@/lib/reminders';
import { clearCreatedCommunityPosts } from '@/lib/community-posts-store';
import SignInScreen from '@/components/sign-in';

function VerifiedSession({ children }: PropsWithChildren) {
  const { isAuthenticated, isLoading } = useConvexAuth();
  const { signOut } = useClerk();
  const [signOutError, setSignOutError] = useState(false);
  if (isLoading)
    return <ActivityIndicator accessibilityLabel="Verifying session" />;
  if (!isAuthenticated)
    return (
      <View style={{ padding: 24, gap: 16 }}>
        <Text>
          Unable to verify your account. Check your connection and try signing
          in again.
        </Text>
        <Button
          title="Return to sign in"
          onPress={() => {
            void signOut().catch(() => setSignOutError(true));
          }}
        />
        {signOutError ? <Text>Sign-out failed. Please try again.</Text> : null}
      </View>
    );
  return children;
}

function PrivateSession({ children }: PropsWithChildren) {
  const [resources, setResources] = useState<{
    scope: SessionScope;
    client: ConvexReactClient;
    queries: ReturnType<typeof createQueryClient>;
  } | null>(null);
  const [error, setError] = useState(false);
  const [attempt, setAttempt] = useState(0);
  // Allocate inside the effect: Strict Mode's setup/cleanup/setup cycle must
  // receive a fresh scope and connection rather than reuse disposed state.
  useEffect(() => {
    const scope = new SessionScope();
    const client = new ConvexReactClient(process.env.EXPO_PUBLIC_CONVEX_URL!);
    const queries = createQueryClient();
    void clearDeviceReminders()
      .then(() => {
        if (!scope.signal.aborted) setResources({ scope, client, queries });
      })
      .catch(() => {
        if (!scope.signal.aborted) setError(true);
      });
    return () => {
      scope.dispose();
      void client.close();
      void queries.cancelQueries();
      queries.clear();
      clearCreatedCommunityPosts();
      void clearDeviceReminders().catch(() => {});
    };
  }, [attempt]);
  if (error)
    return (
      <View style={{ padding: 24, gap: 16 }}>
        <Text>Unable to clear device reminders.</Text>
        <Button
          title="Retry"
          onPress={() => {
            setError(false);
            setAttempt((current) => current + 1);
          }}
        />
      </View>
    );
  if (!resources)
    return <ActivityIndicator accessibilityLabel="Preparing private session" />;
  const { scope, client, queries } = resources;
  return (
    <SessionContext.Provider value={scope}>
      <QueryClientProvider client={queries}>
        <ConvexProviderWithClerk client={client} useAuth={useAuth}>
          <VerifiedSession>{children}</VerifiedSession>
        </ConvexProviderWithClerk>
      </QueryClientProvider>
    </SessionContext.Provider>
  );
}

function SessionGate({ children }: PropsWithChildren) {
  const { isLoaded, isSignedIn, sessionId, userId } = useAuth();
  useEffect(() => {
    if (isLoaded && !isSignedIn) void clearDeviceReminders().catch(() => {});
  }, [isLoaded, isSignedIn]);
  if (!isLoaded)
    return <ActivityIndicator accessibilityLabel="Restoring session" />;
  if (!isSignedIn) return <SignInScreen />;
  return (
    <PrivateSession key={`${userId}:${sessionId}`}>{children}</PrivateSession>
  );
}

export function AuthSession({ children }: PropsWithChildren) {
  const key = process.env.EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY;
  if (!key || !process.env.EXPO_PUBLIC_CONVEX_URL)
    return <Text>Authentication is not configured.</Text>;
  return (
    <ClerkProvider publishableKey={key} tokenCache={tokenCache}>
      <SessionGate>{children}</SessionGate>
    </ClerkProvider>
  );
}
