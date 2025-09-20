import { Component, OnInit, ChangeDetectorRef, ElementRef, ViewChild, HostListener } from '@angular/core';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../services/auth.service';
import { ProfileService } from '../../services/profile.service';

@Component({
  selector: 'app-navbar',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './navbar.component.html',
  styleUrls: ['./navbar.component.css'],
})
export class NavbarComponent implements OnInit {

  isDropdownOpen = false;
  isMobileMenuOpen = false;
  isDarkMode = false;
  profileImageUrl: string = 'https://i.pravatar.cc/40';
  user: { name: string; email: string; profileImageUrl: string } | null = null;

  @ViewChild('dropdownMenu') dropdownMenuRef?: ElementRef;
  @ViewChild('dropdownToggleButton') dropdownToggleButtonRef?: ElementRef;
  @ViewChild('mobileMenuToggle') mobileMenuToggleRef?: ElementRef;

  // --- Constructor & Lifecycle Hooks ---
  constructor(
    public authService: AuthService, // Public for template access
    private router: Router,
    private profileService: ProfileService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    // Subscribe to user changes to update the local user object
    this.authService.getCurrentUserObservable().subscribe(currentUser => {
      this.user = currentUser;
      this.cdr.markForCheck();
    });

    // Subscribe to login status to fetch profile image or reset it
    this.authService.getLoggedInObservable().subscribe(isLoggedIn => {
      if (isLoggedIn) {
        this.fetchProfileImage();
      } else {
        this.profileImageUrl = 'https://i.pravatar.cc/40'; // Reset on logout
        this.cdr.markForCheck();
      }
    });
  }

  // --- Click Outside Detection ---
  @HostListener('document:click', ['$event.target'])
  onClickOutside(target: HTMLElement): void {
    // Handle dropdown click outside
    if (this.isDropdownOpen) {
      const clickedOnToggle = this.dropdownToggleButtonRef?.nativeElement.contains(target);
      if (clickedOnToggle) {
        return; // The toggle function will handle its own state
      }

      const clickedInsideMenu = this.dropdownMenuRef?.nativeElement.contains(target);
      if (!clickedInsideMenu) {
        this.closeDropdown(); // Close the dropdown if the click was outside
      }
    }

    // Handle mobile menu click outside
    if (this.isMobileMenuOpen) {
      const clickedOnMobileToggle = this.mobileMenuToggleRef?.nativeElement.contains(target);
      if (clickedOnMobileToggle) {
        return; // The toggle function will handle its own state
      }

      // Check if click was inside mobile menu
      const mobileMenu = document.querySelector('.fixed.top-17');
      const clickedInsideMobileMenu = mobileMenu?.contains(target);
      if (!clickedInsideMobileMenu) {
        this.closeMobileMenu();
      }
    }
  }

  // --- Dropdown Methods ---
  toggleDropdown(): void {
    this.isDropdownOpen = !this.isDropdownOpen;
  }

  closeDropdown(): void {
    this.isDropdownOpen = false;
  }

  // --- Mobile Menu Methods ---
  toggleMobileMenu(): void {
    this.isMobileMenuOpen = !this.isMobileMenuOpen;
    // Close dropdown when opening mobile menu
    if (this.isMobileMenuOpen) {
      this.closeDropdown();
    }
  }

  closeMobileMenu(): void {
    this.isMobileMenuOpen = false;
  }

  // --- Navigation Methods ---
  navigateTo(path: string): void {
    this.router.navigate([path]);
    this.closeDropdown(); // Close dropdown after navigation
  }

  navigateToAndCloseMobile(path: string): void {
    this.router.navigate([path]);
    this.closeMobileMenu(); // Close mobile menu after navigation
  }

  logout(): void {
    this.authService.logout();
    this.router.navigate(['/auth']);
    this.closeDropdown(); // Ensure dropdown is closed
  }

  logoutAndCloseMobile(): void {
    this.authService.logout();
    this.router.navigate(['/auth']);
    this.closeMobileMenu(); // Ensure mobile menu is closed
  }

  goToLogin(): void {
    this.router.navigate(['/auth']);
  }

  goToLoginAndCloseMobile(): void {
    this.router.navigate(['/auth']);
    this.closeMobileMenu();
  }

  goToCreateTrip(): void {
    if (!this.authService.isLoggedIn()) {
      this.router.navigate(['/auth']);
      return;
    }
    
    if (this.authService.isVerifiedDriver()) {
      this.router.navigate(['/create-trip']);
    } else {
      // Redirect to verification if not a driver
      this.navigateTo('/verify-driver');
    }
  }

  goToCreateTripAndCloseMobile(): void {
    if (!this.authService.isLoggedIn()) {
      this.router.navigate(['/auth']);
      this.closeMobileMenu();
      return;
    }
    
    if (this.authService.isVerifiedDriver()) {
      this.router.navigate(['/create-trip']);
    } else {
      // Redirect to verification if not a driver
      this.navigateToAndCloseMobile('/verify-driver');
    }
    this.closeMobileMenu();
  }

  // --- Feature Methods ---
  fetchProfileImage(): void {
    const isDriver = this.authService.isVerifiedDriver();
    const profileObs = isDriver 
      ? this.profileService.getDriverProfile() 
      : this.profileService.getPassengerProfile();

    profileObs.subscribe({
      next: (res) => {
        this.profileImageUrl = res.data?.profileImageUrl || res.data?.driverImageUrl || 'https://i.pravatar.cc/40';
        this.cdr.markForCheck();
      },
      error: () => {
        this.profileImageUrl = 'https://i.pravatar.cc/40'; // Fallback on error
        this.cdr.markForCheck();
      }
    });
  }

  toggleDarkMode(): void {
    this.isDarkMode = !this.isDarkMode;
    document.documentElement.classList.toggle('dark', this.isDarkMode);
  }
}