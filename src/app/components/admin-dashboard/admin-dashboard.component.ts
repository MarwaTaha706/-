import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router'; // استيراد RouterModule لعرض المحتوى عبر <router-outlet>
import { AuthService } from '../../services/auth.service'; // استيراد خدمة المصادقة للوصول إلى دالة logout

@Component({
  selector: 'app-admin-dashboard',
  standalone: true,
  // تأكد من وجود RouterModule هنا للسماح باستخدام routerLink و routerLinkActive و router-outlet في القالب
  imports: [CommonModule, RouterModule],
  templateUrl: './admin-dashboard.component.html',
  styleUrls: ['./admin-dashboard.component.css']
})
export class AdminDashboardComponent {

  /**
   * الـ constructor هو المكان الذي نقوم فيه بحقن (inject) الخدمات التي يحتاجها المكون.
   * @param authService - خدمة للتعامل مع عمليات المصادقة مثل تسجيل الخروج.
   * @param router - خدمة للتحكم في التنقل بين الصفحات برمجيًا.
   */
  constructor(
    private authService: AuthService,
    private router: Router
  ) {}

  /**
   * دالة يتم استدعاؤها عند النقر على زر "تسجيل الخروج".
   * تقوم بتنفيذ عملية الخروج ثم تعيد توجيه المستخدم إلى صفحة تسجيل الدخول الرئيسية.
   */
  logout(): void {
    // استدعاء دالة logout من AuthService التي تقوم بإزالة التوكن من localStorage
    this.authService.logout();

    // استخدام الـ Router لتوجيه المستخدم إلى صفحة المصادقة الرئيسية
    this.router.navigate(['/auth']);
  }
}
