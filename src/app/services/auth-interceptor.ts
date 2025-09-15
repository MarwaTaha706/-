import { inject } from '@angular/core';
import { HttpInterceptorFn, HttpRequest, HttpHandlerFn } from '@angular/common/http';
import { AuthService } from './auth.service';

export const authInterceptor: HttpInterceptorFn = (req: HttpRequest<unknown>, next: HttpHandlerFn ) => {
  // حقن AuthService للحصول على التوكن
  const authService = inject(AuthService);
  const token = authService.getToken();

  // التحقق من وجود التوكن
  if (token) {
    // إذا كان التوكن موجودًا، قم بنسخ الطلب وأضف ترويسة المصادقة
    const authReq = req.clone({
      setHeaders: {
        Authorization: `Bearer ${token}`
      }
    });
    // إرسال الطلب المعدل
    return next(authReq);
  }

  // إذا لم يكن هناك توكن، أرسل الطلب الأصلي كما هو
  return next(req);
};
