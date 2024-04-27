// This is the main page component.
// It corresponds to the "/" route (if named index.tsx) or "/someRoute" (if named someRoute.tsx).

import React from 'react';
import App from './components/App'; 

export default function Home() {
  // Render the App client component within this server component.
  return <App />;
}
