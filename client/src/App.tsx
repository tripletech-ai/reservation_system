import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Login from './pages/Login';
import AdminLayout from './pages/Admin/AdminLayout';
import Members from './pages/Admin/Members';
import Bookings from './pages/Admin/Bookings';
import Event from './pages/Admin/Event';
import EventEdit from './pages/Admin/EventEdit';
import ScheduleTimes from './pages/Admin/ScheduleTime';
import ScheduleTimeEdit from './pages/Admin/ScheduleTimeEdit';
import Booking from './pages/Booking';
import Register from './pages/Register';
import './index.css';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Login />} />

        <Route path="/admin" element={<AdminLayout />}>
          <Route index element={<Navigate to="members" replace />} />
          <Route path="members" element={<Members />} />
          <Route path="bookings" element={<Bookings />} />
          <Route path="event" element={<Event />} />
          <Route path="event/:id" element={<EventEdit />} />
          <Route path="schedule_time" element={<ScheduleTimes />} />
          <Route path="schedule_time/:id" element={<ScheduleTimeEdit />} />
        </Route>

        <Route path="/booking/*" element={<Booking />} />
        <Route path="/register" element={<Register />} />

        {/* Fallback */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
