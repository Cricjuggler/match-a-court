export type Surface = 'Wooden' | 'Synthetic' | 'Mat' | 'Cement';

export interface Court {
  id: string;
  name: string;
  location: string;
  surface: Surface;
  indoor: boolean;
  openHour: number;
  closeHour: number;
  photoUrl: string | null;
  photoUrls: string[];
}

export interface Booking {
  id: string;
  courtId: string;
  userId: string;
  date: string;
  startHour: number;
  createdAt: string;
}

export interface BookingWithCourt extends Booking {
  courtName: string;
  courtLocation: string;
}
