// To clear AsyncStorage in your React Native app, follow these steps:

console.log('🧹 AsyncStorage Clearing Instructions:');
console.log('');
console.log('Option 1: Use the ClearStorageButton component');
console.log(
  '1. Import the component: import { ClearStorageButton } from "./components/ClearStorageButton";'
);
console.log('2. Add <ClearStorageButton /> to any screen');
console.log('3. Tap the "Clear All Storage" button');
console.log('');
console.log('Option 2: Add clearing code directly to any component');
console.log('1. Import: import { localStorage } from "@/lib/storage";');
console.log('2. Call: await localStorage.clear();');
console.log('');
console.log('Option 3: Quick developer solution');
console.log('1. Uninstall the app from your device/simulator');
console.log('2. Reinstall it - this clears all local data');
console.log('');
console.log('🗄️  Database data was already cleared by the migration');
console.log(
  '✅ Once you clear AsyncStorage, your app will start completely fresh!'
);
