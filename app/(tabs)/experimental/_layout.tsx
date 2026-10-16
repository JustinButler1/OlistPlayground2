import { Stack } from 'expo-router/stack';

export default function ExperimentalLayout() {
  return (
    <Stack>
      <Stack.Screen name="index" options={{ title: 'Experimental' }} />
    </Stack>
  );
}
