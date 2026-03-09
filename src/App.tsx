import { Redirect, Route } from 'react-router-dom';
import { IonApp, IonRouterOutlet, setupIonicReact, IonSpinner } from '@ionic/react';
import { IonReactRouter } from '@ionic/react-router';
import Home from './pages/Home';
import Login from './pages/Login';
import Register from './pages/Register';
import Profile from './pages/Profile';
import { AuthProvider, useAuth } from './contexts/AuthContext';

/* Core CSS required for Ionic components to work properly */
import '@ionic/react/css/core.css';

/* Basic CSS for apps built with Ionic */
import '@ionic/react/css/normalize.css';
import '@ionic/react/css/structure.css';
import '@ionic/react/css/typography.css';

/* Optional CSS utils */
import '@ionic/react/css/padding.css';
import '@ionic/react/css/float-elements.css';
import '@ionic/react/css/text-alignment.css';
import '@ionic/react/css/text-transformation.css';
import '@ionic/react/css/flex-utils.css';
import '@ionic/react/css/display.css';

/* Theme variables */
import './theme/variables.css';

setupIonicReact();

const PrivateRoute: React.FC<{ component: React.ComponentType<any>; path: string; exact?: boolean }> = ({ component: Component, ...rest }) => {
  const { currentUser, loading } = useAuth();

  if (loading) {
    return <div style={{ display: 'flex', height: '100vh', justifyContent: 'center', alignItems: 'center' }}><IonSpinner name="dots" /></div>;
  }

  return (
    <Route {...rest} render={props => (
      currentUser ? <Component {...props} /> : <Redirect to="/login" />
    )} />
  );
};

const PublicRoute: React.FC<{ component: React.ComponentType<any>; path: string; exact?: boolean }> = ({ component: Component, ...rest }) => {
  const { currentUser, loading } = useAuth();

  if (loading) {
    return <div style={{ display: 'flex', height: '100vh', justifyContent: 'center', alignItems: 'center' }}><IonSpinner name="dots" /></div>;
  }

  return (
    <Route {...rest} render={props => (
      !currentUser ? <Component {...props} /> : <Redirect to="/home" />
    )} />
  );
};

import CreateJob from './pages/CreateJob';
import MyRequests from './pages/MyRequests';
import SearchProviders from './pages/SearchProviders';
import ProviderJobs from './pages/ProviderJobs';
import Chat from './pages/Chat';
import Notifications from './pages/Notifications';
import ProviderProfileView from './pages/ProviderProfileView';
import ChatList from './pages/ChatList';


const App: React.FC = () => (
  <AuthProvider>
    <IonApp>
      <IonReactRouter>
        <IonRouterOutlet>
          <PublicRoute path="/login" component={Login} exact={true} />
          <PublicRoute path="/register" component={Register} exact={true} />
          <PrivateRoute path="/home" component={Home} exact={true} />
          <PrivateRoute path="/profile" component={Profile} exact={true} />
          <PrivateRoute path="/create-job" component={CreateJob} exact={true} />
          <PrivateRoute path="/my-requests" component={MyRequests} exact={true} />
          <PrivateRoute path="/search" component={SearchProviders} exact={true} />
          <PrivateRoute path="/provider-jobs" component={ProviderJobs} exact={true} />
          <PrivateRoute path="/chat" component={Chat} exact={true} />
          <PrivateRoute path="/chat-list" component={ChatList} exact={true} />
          <PrivateRoute path="/notifications" component={Notifications} exact={true} />

          <PrivateRoute path="/provider/:id" component={ProviderProfileView} exact={true} />
          <Route exact path="/">
            <Redirect to="/home" />
          </Route>
        </IonRouterOutlet>
      </IonReactRouter>
    </IonApp>
  </AuthProvider>
);

export default App;
