import { Redirect, Route } from 'react-router-dom';
import { IonApp, IonRouterOutlet, setupIonicReact } from '@ionic/react';
import { IonReactRouter } from '@ionic/react-router';

import LoginPage from './pages/LoginPage';
import WelcomePage from './pages/WelcomePage';
import OnboardingWizardPage from './pages/OnboardingWizardPage';
import OperationsPage from './pages/OperationsPage';
import ReportsPage from './pages/ReportsPage';
import AgilitoPage from './pages/AgilitoPage';
import ChatsPage from './pages/ChatsPage';
import PaymentsHubPage from './pages/PaymentsHubPage';
import ProductsPage from './pages/ProductsPage';
import MarketingPage from './pages/MarketingPage';
import BrandDataPage from './pages/BrandDataPage';
import LocationsPage from './pages/LocationsPage';
import SettingsPage from './pages/SettingsPage';
import NotificationsPage from './pages/NotificationsPage';
import { AppProvider, useApp } from './context/AppContext';
import { OrdersSocketProvider } from './context/OrdersSocketProvider';
import { ToastUx } from './components/ToastUx';
import { BrandTransitionOverlay } from './components/BrandTransitionOverlay';
import { AppLaunchSplash } from './components/AppLaunchSplash';
import { branded } from './components/RequireBrand';
import { useNativeChrome } from './hooks/useNativeChrome';

import '@ionic/react/css/core.css';
import '@ionic/react/css/normalize.css';
import '@ionic/react/css/structure.css';
import '@ionic/react/css/typography.css';
import '@ionic/react/css/padding.css';
import '@ionic/react/css/float-elements.css';
import '@ionic/react/css/text-alignment.css';
import '@ionic/react/css/text-transformation.css';
import '@ionic/react/css/flex-utils.css';
import '@ionic/react/css/display.css';
import '@ionic/react/css/palettes/dark.class.css';

import './theme/variables.css';
import './theme/agiliza.css';

setupIonicReact();

const BrandedOperationsPage = branded(OperationsPage);
const BrandedReportsPage = branded(ReportsPage);
const BrandedAgilitoPage = branded(AgilitoPage);
const BrandedChatsPage = branded(ChatsPage);
const BrandedPaymentsHubPage = branded(PaymentsHubPage);
const BrandedProductsPage = branded(ProductsPage);
const BrandedMarketingPage = branded(MarketingPage);
const BrandedBrandDataPage = branded(BrandDataPage);
const BrandedLocationsPage = branded(LocationsPage);
const BrandedSettingsPage = branded(SettingsPage);
const BrandedNotificationsPage = branded(NotificationsPage);
const BrandedOnboardingPage = branded(OnboardingWizardPage);

const WelcomeRoute: React.FC = () => {
  const { authEpoch } = useApp();
  return <WelcomePage key={`welcome-${authEpoch}`} />;
};

const AppRoutes: React.FC = () => {
  useNativeChrome();

  return (
    <IonRouterOutlet>
      <Route exact path="/login" component={LoginPage} />
      <Route exact path="/welcome" component={WelcomeRoute} />
      <Route exact path="/app/onboarding" component={BrandedOnboardingPage} />
      <Route exact path="/app/operations" component={BrandedOperationsPage} />
      <Route exact path="/app/reports" component={BrandedReportsPage} />
      <Route exact path="/app/agilito" component={BrandedAgilitoPage} />
      <Route exact path="/app/payments" component={BrandedPaymentsHubPage} />
      <Route exact path="/app/business">
        <Redirect to="/app/agilito" />
      </Route>
      <Route exact path="/app/chats" component={BrandedChatsPage} />
      <Route exact path="/app/products" component={BrandedProductsPage} />
      <Route exact path="/app/productos" component={BrandedProductsPage} />
      <Route exact path="/app/clients" component={BrandedMarketingPage} />
      <Route exact path="/app/marketing/clientes" component={BrandedMarketingPage} />
      <Route exact path="/app/locations" component={BrandedLocationsPage} />
      <Route exact path="/app/locales" component={BrandedLocationsPage} />
      <Route exact path="/app/datos-marca" component={BrandedBrandDataPage} />
      <Route exact path="/app/brand-data" component={BrandedBrandDataPage} />
      <Route exact path="/app/profile" component={BrandedSettingsPage} />
      <Route exact path="/app/notifications" component={BrandedNotificationsPage} />
      <Route exact path="/app">
        <Redirect to="/app/agilito" />
      </Route>
      <Route exact path="/">
        <Redirect to="/login" />
      </Route>
    </IonRouterOutlet>
  );
};

const App: React.FC = () => (
  <IonApp>
    <AppLaunchSplash />
    <AppProvider>
      <OrdersSocketProvider>
        <IonReactRouter>
          <AppRoutes />
          <BrandTransitionOverlay />
          <ToastUx />
        </IonReactRouter>
      </OrdersSocketProvider>
    </AppProvider>
  </IonApp>
);

export default App;
