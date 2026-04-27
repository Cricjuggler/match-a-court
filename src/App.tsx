import { Route, Routes } from 'react-router-dom';
import { Nav } from './components/Nav';
import { Home } from './pages/home';
import { AuthPage } from './pages/auth';
import { AccountPage } from './pages/account';
import { CourtDetail } from './pages/court-detail';
import { MyBookings } from './pages/my-bookings';
import { FindGame } from './pages/find-game';
import { NotificationsPage } from './pages/notifications';

export default function App() {
  return (
    <div className="app">
      <Nav />
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/courts/:id" element={<CourtDetail />} />
        <Route path="/my-bookings" element={<MyBookings />} />
        <Route path="/find-game" element={<FindGame />} />
        <Route path="/notifications" element={<NotificationsPage />} />
        <Route path="/auth/:pathname" element={<AuthPage />} />
        <Route path="/account/:pathname" element={<AccountPage />} />
      </Routes>
    </div>
  );
}
