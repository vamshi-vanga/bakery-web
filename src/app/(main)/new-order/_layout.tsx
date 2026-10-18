import { Stack } from 'expo-router';

export default function NewOrderLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
      }}
    >
      <Stack.Screen name="index" />
      <Stack.Screen
        name="checkout"
        options={{
          presentation: 'card',
        }}
      />
      <Stack.Screen
        name="success"
        options={{
          presentation: 'card',
          gestureEnabled: false,
        }}
      />
    </Stack>
  );
}
