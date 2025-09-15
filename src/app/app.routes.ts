import { Routes } from '@angular/router';
import { LandingComponent } from './pages/landing/landing.component';
import { PassengerDashboardComponent } from './pages/passenger-dashboard/passenger-dashboard.component';
import { ProfileComponent } from './pages/profile/profile.component';
import { TripDetailsComponent } from './pages/trip-details/trip-details.component';
import { CreateTripComponent } from './pages/create-trip/create-trip.component';
import { AuthComponent } from './pages/auth/auth.component';
import { LayoutComponent } from './layout/layout.component';
import { VerifyDriverComponent } from './pages/verify-driver/verify-driver.component';
import { SuggestedTripsComponent } from './pages/suggested-trips/suggested-trips.component';
import { SuggestTripComponent } from './pages/suggest-trip/suggest-trip.component';
import { MySuggestedTripsComponent } from './pages/my-suggested-trips/my-suggested-trips.component';
// =================================================
// 2. استيراد مكونات وحارس لوحة تحكم المسؤول
// =================================================
import { AdminDashboardComponent } from './components/admin-dashboard/admin-dashboard.component';
import { DriversListComponent } from './drivers-list/drivers-list.component';
import { PassengersListComponent } from './passengers-list/passengers-list.component';
import { DriverDetailsComponent } from './driver-details/driver-details.component';
import { adminGuard } from './admin.guard'; // استيراد الحارس الذي أنشأناه
import { driverGuard } from './driver.guard'; // استيراد حارس السائق
export const routes: Routes = [
    {
    path: '',
    component: LayoutComponent,
    children: [
      { path: '', component: LandingComponent },
      { path: 'passenger-dashboard', component: PassengerDashboardComponent },
      { path: 'trip-details/:id', component: TripDetailsComponent },
      { path: 'create-trip', component: CreateTripComponent, canActivate: [driverGuard] },
      { path: 'profile', component: ProfileComponent },
      { path: 'verify-driver', component: VerifyDriverComponent},
      { path: 'suggested-trips', component: SuggestedTripsComponent },
      { path: 'suggest-trip', component: SuggestTripComponent},
      { path: 'suggest-trip/:id', component: SuggestTripComponent },
      { path: 'my-suggested-trips', component: MySuggestedTripsComponent },
      {
        path: 'admin', // المسار الرئيسي للوحة التحكم
        component: AdminDashboardComponent, // المكون الذي يحتوي على الشريط الجانبي ومنطقة المحتوى
        canActivate: [adminGuard], // تطبيق الحارس: لا يمكن الوصول لهذا المسار وأبنائه إلا إذا كان المستخدم مسؤولاً
        children: [
          // إعادة توجيه تلقائي من /admin إلى /admin/passengers
          // هذا يضمن أن المستخدم يرى صفحة الركاب بمجرد دخوله للوحة التحكم
          { path: '', redirectTo: 'passengers', pathMatch: 'full' },
          
          // مسار لعرض قائمة الركاب داخل لوحة التحكم
          { path: 'passengers', component: PassengersListComponent },
          
          // مسار لعرض قائمة السائقين داخل لوحة التحكم
          { path: 'drivers', component: DriversListComponent },
          
          // مسار لعرض تفاصيل سائق معين (يحتوي على ID في الرابط)
          { path: 'drivers/:id', component: DriverDetailsComponent },
        ]
      },
      
    ]
  },
  { path: 'auth', component: AuthComponent },
];
