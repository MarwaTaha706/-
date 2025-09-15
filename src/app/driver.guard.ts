import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from './services/auth.service';

export const driverGuard = () => {
  const authService = inject(AuthService);
  const router = inject(Router);

  // Check if user is logged in
  if (!authService.isLoggedIn()) {
    router.navigate(['/auth']);
    return false;
  }

  // Check if user is verified as driver
  if (authService.isVerifiedDriver()) {
    return true;
  } else {
    // Redirect to driver verification page
    router.navigate(['/verify-driver']);
    return false;
  }
}; 