import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators, AbstractControl } from '@angular/forms';
import { Router } from '@angular/router';
import { DomSanitizer, SafeUrl } from '@angular/platform-browser';
import { finalize } from 'rxjs';
import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';
import { RegisterDriverService } from '../../services/register-driver.service';
import { AuthService } from '../../services/auth.service';
import {
  faShieldAlt, faCheckCircle, faExclamationTriangle, faIdCard,
  faUserCheck, faCameraRetro, faCar, faClipboardCheck, faEdit,
  faArrowRight, faArrowLeft, faInfoCircle, faTimes, faCarSide // New icon for car license
} from '@fortawesome/free-solid-svg-icons';
import { trigger, state, style, transition, animate } from '@angular/animations';

function arrayRequired(control: AbstractControl) {
  const value = control.value;
  return Array.isArray(value) && value.length > 0 ? null : { required: true };
}

@Component({
  selector: 'app-verify-driver',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, FontAwesomeModule],
  templateUrl: './verify-driver.component.html',
  styleUrls: ['./verify-driver.component.css'],
  animations: [
    trigger('toastState', [
      state('void', style({ transform: 'translateY(150%)', opacity: 0 })),
      state('*', style({ transform: 'translateY(0)', opacity: 1 })),
      transition('void <=> *', animate('400ms ease-in-out'))
    ])
  ]
})
export class VerifyDriverComponent implements OnInit {
  private fb = inject(FormBuilder);
  private router = inject(Router);
  private registerDriverService = inject(RegisterDriverService);
  private authService = inject(AuthService);
  private sanitizer = inject(DomSanitizer);

  icons = {
    main: faShieldAlt, success: faCheckCircle, error: faExclamationTriangle,
    license: faIdCard, carLicense: faCarSide, // Added icon for car license
    identity: faUserCheck, camera: faCameraRetro, vehicle: faCar,
    review: faClipboardCheck, edit: faEdit, prev: faArrowRight,
    next: faArrowLeft, info: faInfoCircle, close: faTimes
  };

  verificationForm!: FormGroup;
  currentStep = 1;
  totalSteps = 6; // ✅ UPDATED: Total steps is now 6
  isSubmitting = false;
  toast: { message: string, type: 'success' | 'error' } | null = null;
  showSuccessPopup = false;

  previews: { [key: string]: SafeUrl[] } = {
    licenseFile: [],
    carLicenseFile: [], // ✅ ADDED: Preview array for car license images
    driverIdFile: [],
    vehicleImages: []
  };

  get f() { return this.verificationForm.controls; }

  ngOnInit(): void {
    this.verificationForm = this.fb.group({
      licenseFile: [null, [arrayRequired]],
      carLicenseFile: [null, [arrayRequired]], // ✅ ADDED: Form control for car license images
      driverIdFile: [null, [arrayRequired]],
      vehicleImages: [null, [arrayRequired]],
      vehicleMake: ['', [Validators.required]],
      vehicleModel: ['', [Validators.required]],
      vehicleColor: ['', [Validators.required]],
      vehicleSeats: [null, [Validators.required, Validators.min(1)]],
      plateNumber: ['', [Validators.required]],
      description: ['']
    });
  }

  nextStep(): void {
    if (this.isStepValid()) {
      this.currentStep++;
    } else {
      this.markStepAsTouched();
      this.showToast('يرجى إكمال جميع الحقول المطلوبة في هذه الخطوة.', 'error');
    }
  }

  previousStep(): void {
    if (this.currentStep > 1) {
      this.currentStep--;
    }
  }

  isStepValid(): boolean {
    // ✅ UPDATED: Validation logic now includes the new step
    switch (this.currentStep) {
      case 1: return this.f['licenseFile'].valid;
      case 2: return this.f['carLicenseFile'].valid;
      case 3: return this.f['driverIdFile'].valid;
      case 4: return this.f['vehicleImages'].valid;
      case 5: return ['vehicleMake', 'vehicleModel', 'vehicleColor', 'vehicleSeats', 'plateNumber'].every(field => this.f[field]?.valid);
      default: return true;
    }
  }

  getStepTitle(): string {
    // ✅ UPDATED: Titles array now includes the new step
    const titles = ['رخصة القيادة', 'رخصة السيارة', 'هوية السائق', 'صور المركبة', 'بيانات المركبة', 'المراجعة النهائية'];
    return titles[this.currentStep - 1];
  }

  onFileSelected(event: Event, controlName: 'licenseFile' | 'carLicenseFile' | 'driverIdFile' | 'vehicleImages'): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      const files = Array.from(input.files);
      this.verificationForm.patchValue({ [controlName]: files });
      this.previews[controlName] = files.map(file => this.sanitizer.bypassSecurityTrustUrl(URL.createObjectURL(file)));
      this.verificationForm.get(controlName)?.updateValueAndValidity();
    }
  }

  onSubmit(): void {
    if (this.verificationForm.invalid) {
      this.verificationForm.markAllAsTouched();
      this.showToast('الرجاء مراجعة البيانات، هناك حقول غير مكتملة.', 'error');
      return;
    }

    const formValue = this.verificationForm.value;
    if (!formValue.licenseFile?.length || !formValue.carLicenseFile?.length || !formValue.driverIdFile?.length || !formValue.vehicleImages?.length) {
      this.showToast('جميع مستندات التوثيق مطلوبة (رخصة القيادة، رخصة السيارة، الهوية، صور المركبة).', 'error');
      return;
    }

    const currentUserId = this.authService.getCurrentUserId();
    if (!currentUserId) {
      this.showToast('لا يمكن تحديد هوية المستخدم. الرجاء تسجيل الدخول مرة أخرى.', 'error');
      return;
    }

    this.isSubmitting = true;

    // 1. تجهيز بيانات رفع المستندات الشخصية فقط
    // const docsFormData = new FormData();
    // docsFormData.append('Comment', formValue.description || '');
    // (formValue.licenseFile as File[]).forEach(file => docsFormData.append('DriverLicense', file));
    // (formValue.driverIdFile as File[]).forEach(file => docsFormData.append('Identity', file));
    // // VehicleRegistration هنا تعني رخصة السيارة فقط
    // (formValue.carLicenseFile as File[]).forEach(file => docsFormData.append('VehicleRegistration', file));
    const driverFormData = new FormData();
    driverFormData.append('DriverDescription', formValue.description || '');
    driverFormData.append('VehicleDetailsCommand.DriverId', currentUserId);
    driverFormData.append('VehicleDetailsCommand.Model', formValue.vehicleModel);
    driverFormData.append('VehicleDetailsCommand.Color', formValue.vehicleColor);
    driverFormData.append('VehicleDetailsCommand.PlateNumber', formValue.plateNumber);
    driverFormData.append('VehicleDetailsCommand.SeatsNumber', formValue.vehicleSeats.toString());
    driverFormData.append('VehicleDetailsCommand.Description', formValue.description || '');
    // VehicleImageUrls هنا تعني صور السيارة فقط
    (formValue.vehicleImages as File[]).forEach(file => driverFormData.append('VehicleDetailsCommand.VehicleImageUrls', file));
    (formValue.licenseFile as File[]).forEach(file => driverFormData.append('VehicleDetailsCommand.DriverLicense', file));
    (formValue.driverIdFile as File[]).forEach(file => driverFormData.append('VehicleDetailsCommand.Identity', file));
    (formValue.carLicenseFile as File[]).forEach(file => driverFormData.append('VehicleDetailsCommand.VehicleRegistration', file));

    // طباعة محتوى docsFormData
    // for (let pair of docsFormData.entries()) {
    //   console.log('DOCS:', pair[0], pair[1]);
    // }

    this.registerDriverService.registerDriver(driverFormData)
      .pipe(finalize(() => this.isSubmitting = false))
      .subscribe({
        next: (regRes) => {
          if (regRes && regRes.status === 200) {
            this.showSuccessPopup = true;
          } else {
            this.showToast(regRes?.message || 'فشل إرسال بيانات السائق.', 'error');
          }
        },
        error: (err) => {
          this.showToast(err.error?.message || 'حدث خطأ أثناء إرسال بيانات السائق.', 'error');
        }
      });
  }

  showToast(message: string, type: 'success' | 'error'): void {
    this.toast = { message, type };
    setTimeout(() => this.hideToast(), 5000);
  }

  hideToast(): void { this.toast = null; }

  closeSuccessPopup() {
    this.showSuccessPopup = false;
    this.router.navigate(['/']);
  }

  private markStepAsTouched(): void {
    // ✅ UPDATED: Mark controls as touched for each step
    const stepControls: { [key: number]: string[] } = {
      1: ['licenseFile'],
      2: ['carLicenseFile'],
      3: ['driverIdFile'],
      4: ['vehicleImages'],
      5: ['vehicleMake', 'vehicleModel', 'vehicleColor', 'vehicleSeats', 'plateNumber']
    };

    const controlsToTouch = stepControls[this.currentStep];
    if (controlsToTouch) {
      controlsToTouch.forEach(field => this.f[field]?.markAsTouched());
    }
  }
}
