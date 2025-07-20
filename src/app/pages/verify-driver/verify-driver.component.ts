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
  faArrowRight, faArrowLeft, faInfoCircle, faTimes, faCarSide
} from '@fortawesome/free-solid-svg-icons';
import { trigger, state, style, transition, animate } from '@angular/animations';

// Custom validator to ensure a file array is not empty
function arrayRequired(control: AbstractControl): { [key: string]: any } | null {
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
    license: faIdCard, carLicense: faCarSide,
    identity: faUserCheck, camera: faCameraRetro, vehicle: faCar,
    review: faClipboardCheck, edit: faEdit, prev: faArrowRight,
    next: faArrowLeft, info: faInfoCircle, close: faTimes
  };

  verificationForm!: FormGroup;
  currentStep = 1;
  totalSteps = 6;
  isSubmitting = false;
  toast: { message: string, type: 'success' | 'error' } | null = null;
  showSuccessPopup = false;

  // Holds the safe URLs for image previews
  previews: { [key: string]: SafeUrl[] } = {
    licenseFile: [],
    carLicenseFile: [],
    driverIdFile: [],
    vehicleImages: []
  };

  // Manually tracks the actual File objects for each control
  private selectedFiles: { [key: string]: File[] } = {
    licenseFile: [],
    carLicenseFile: [],
    driverIdFile: [],
    vehicleImages: []
  };

  get f() { return this.verificationForm.controls; }

  ngOnInit(): void {
    this.verificationForm = this.fb.group({
      licenseFile: [[], [arrayRequired]],
      carLicenseFile: [[], [arrayRequired]],
      driverIdFile: [[], [arrayRequired]],
      vehicleImages: [[], [arrayRequired]],
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
    const titles = ['رخصة القيادة', 'رخصة السيارة', 'هوية السائق', 'صور المركبة', 'بيانات المركبة', 'المراجعة النهائية'];
    return titles[this.currentStep - 1];
  }

  // This method now adds newly selected files to our tracking array
  onFileSelected(event: Event, controlName: string): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      const newFiles = Array.from(input.files);
      this.selectedFiles[controlName].push(...newFiles);
      this.updateFormControl(controlName);
      // Clear the input value to allow selecting the same file again after removing it
      input.value = '';
    }
  }

  // This new method removes a specific image by its index
  removeImage(controlName: string, index: number): void {
    // Remove the file from our manual tracking array
    this.selectedFiles[controlName].splice(index, 1);
    // Update the form and previews
    this.updateFormControl(controlName);
  }

  // A helper function to keep the form value and previews in sync
  private updateFormControl(controlName: string): void {
    const files = this.selectedFiles[controlName];
    // Update the form control's value with the current file array
    this.verificationForm.patchValue({ [controlName]: files });
    this.verificationForm.get(controlName)?.markAsTouched();
    this.verificationForm.get(controlName)?.updateValueAndValidity();
    // Regenerate the previews based on the current file array
    this.previews[controlName] = files.map(file => this.sanitizer.bypassSecurityTrustUrl(URL.createObjectURL(file)));
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

  closeSuccessPopup(): void {
    this.showSuccessPopup = false;
    this.router.navigate(['/']);
  }

  private markStepAsTouched(): void {
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
