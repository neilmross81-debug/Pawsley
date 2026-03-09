import React from 'react';
import { useHistory, useLocation } from 'react-router-dom';
import { IonIcon } from '@ionic/react';
import {
    homeOutline, home,
    searchOutline, search,
    calendarOutline, calendar,
    personOutline, person,
    briefcaseOutline, briefcase
} from 'ionicons/icons';
import { useAuth } from '../contexts/AuthContext';
import './BottomNavigation.css';

const BottomNavigation: React.FC = () => {
    const history = useHistory();
    const location = useLocation();
    const { userRole } = useAuth();

    const isActive = (path: string) => location.pathname === path;

    const tabs = userRole === 'provider'
        ? [
            { path: '/home', label: 'Home', icon: homeOutline, activeIcon: home },
            { path: '/search', label: 'Find Owners', icon: searchOutline, activeIcon: search },
            { path: '/provider-jobs', label: 'Jobs', icon: briefcaseOutline, activeIcon: briefcase },
            { path: '/profile', label: 'Account', icon: personOutline, activeIcon: person },
        ]
        : [
            { path: '/home', label: 'Home', icon: homeOutline, activeIcon: home },
            { path: '/search', label: 'Find Walkers', icon: searchOutline, activeIcon: search },
            { path: '/my-requests', label: 'Bookings', icon: calendarOutline, activeIcon: calendar },
            { path: '/profile', label: 'Account', icon: personOutline, activeIcon: person },
        ];

    return (
        <div className="paw-tabbar">
            {tabs.map(tab => (
                <button
                    key={tab.path}
                    className={`paw-tab ${isActive(tab.path) ? 'paw-tab--active' : ''}`}
                    onClick={() => history.push(tab.path)}
                >
                    <IonIcon
                        icon={isActive(tab.path) ? tab.activeIcon : tab.icon}
                        className="paw-tab-icon"
                    />
                    <span className="paw-tab-label">{tab.label}</span>
                </button>
            ))}
        </div>
    );
};

export default BottomNavigation;
