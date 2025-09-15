import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from './services/auth.service';

/**
 * adminGuard هو حارس مسار (Route Guard) من نوع CanActivateFn.
 * وظيفته هي حماية المسارات التي تتطلب صلاحيات المسؤول.
 *
 * @param route - المسار الذي يحاول المستخدم الوصول إليه.
 * @param state - حالة الـ Router الحالية.
 * @returns `true` إذا كان يُسمح بالوصول، أو `false` إذا كان يجب منعه.
 */
export const adminGuard: CanActivateFn = (route, state) => {
  
  // نستخدم `inject` لحقن الخدمات التي نحتاجها داخل الحارس.
  // هذه هي الطريقة الحديثة لحقن الخدمات في الحراس والدوال.
  const authService = inject(AuthService);
  const router = inject(Router);

  // الخطوة 1: التحقق مما إذا كان المستخدم هو مسؤول باستخدام الدالة التي أنشأناها.
  if (authService.isAdmin()) {
    // إذا كانت الدالة تُرجع true، فهذا يعني أن المستخدم مسؤول.
    return true; // اسمح بالوصول إلى المسار المطلوب (مثل /admin/passengers).
  } else {
    // الخطوة 2: إذا لم يكن المستخدم مسؤولاً.
    // نقوم بإعادة توجيهه إلى صفحة تسجيل الدخول الرئيسية.
    // هذا يمنع المستخدمين العاديين من رؤية صفحات لوحة التحكم حتى لو كتبوا الرابط مباشرة.
    router.navigate(['/auth']);
    
    // نُرجع false لمنع عملية التنقل الحالية إلى المسار المحمي.
    return false;
  }
};
