// src/app/drivers-list/drivers-list.component.ts

import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AdminService } from '../services/admin.service'; 
import { RouterModule } from '@angular/router';

@Component({
  selector: 'app-drivers-list',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './drivers-list.component.html',
  styleUrls: ['./drivers-list.component.css']
})
export class DriversListComponent implements OnInit {
  drivers: any[] = [];
  isLoading = true;
  // يمكنك إضافة متغيرات لبيانات الترقيم إذا احتجت
  paginationInfo: any = null;

  constructor(private adminService: AdminService) { }

  ngOnInit(): void {
    this.loadDrivers();
  }

  loadDrivers(): void {
    this.isLoading = true;
    // سنفترض أننا نطلب الصفحة الأولى مع 10 عناصر
    this.adminService.getAllDrivers(1, 10).subscribe({
      next: (response) => {
        // *** التعديل الرئيسي هنا ***
        // الوصول إلى مصفوفة السائقين عبر response.data.items
        this.drivers = response.data.items;
        
        // (اختياري) حفظ معلومات الترقيم لعرضها أو استخدامها لاحقًا
        this.paginationInfo = response.data;

        this.isLoading = false;
      },
      error: (err) => {
        console.error('Error fetching drivers:', err);
        this.isLoading = false;
      }
    });
  }
}
