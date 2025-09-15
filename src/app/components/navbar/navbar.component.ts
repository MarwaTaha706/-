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
  isDarkMode = false;
  profileImageUrl: string = 'https://i.pravatar.cc/40';
  user: { name: string; email: string; profileImageUrl: string } | null = null;

 
  @ViewChild('dropdownMenu' ) dropdownMenuRef?: ElementRef;
  @ViewChild('dropdownToggleButton') dropdownToggleButtonRef?: ElementRef;

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
        this.cdr.markForCheck( );
      }
    });
  }

  // --- Click Outside Detection ---
  @HostListener('document:click', ['$event.target'])
  onClickOutside(target: HTMLElement): void {
    // Do nothing if the dropdown is already closed
    if (!this.isDropdownOpen) {
      return;
    }

    // Check if the click was on the toggle button
    const clickedOnToggle = this.dropdownToggleButtonRef?.nativeElement.contains(target);
    if (clickedOnToggle) {
      return; // The toggle function will handle its own state
    }


    const clickedInsideMenu = this.dropdownMenuRef?.nativeElement.contains(target);
    if (!clickedInsideMenu) {
      this.closeDropdown(); // Close the dropdown if the click was outside
    }
  }

  // --- Dropdown and Navigation Methods ---
  toggleDropdown(): void {
    this.isDropdownOpen = !this.isDropdownOpen;
  }

  closeDropdown(): void {
    this.isDropdownOpen = false;
  }

  navigateTo(path: string): void {
    this.router.navigate([path]);
    this.closeDropdown(); // Close dropdown after navigation
  }

  logout(): void {
    this.authService.logout();
    this.router.navigate(['/auth']);
    this.closeDropdown(); // Ensure dropdown is closed
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
        this.cdr.markForCheck( );
      },
      error: () => {
        this.profileImageUrl = 'https://i.pravatar.cc/40'; // Fallback on error
        this.cdr.markForCheck( );
      }
    });
  }

  toggleDarkMode(): void {
    this.isDarkMode = !this.isDarkMode;
    document.documentElement.classList.toggle('dark', this.isDarkMode);
  }

  goToLogin(): void {
    this.router.navigate(['/auth']);
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
}
