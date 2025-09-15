// src/app/services/auth.guard.ts
import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from './auth.service';

export const authGuard: CanActivateFn = (route, state) => {
  const authService = inject(AuthService);
  const router = inject(Router);

  if (authService.isLoggedIn()) {
    return true; // مسموح بالوصول
  } else {
    router.navigate(['/login']); // غير مسموح، أعد التوجيه لصفحة الدخول
    return false;
  }
};
