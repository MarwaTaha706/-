// src/app/passengers-list/passengers-list.component.ts

import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AdminService } from '../services/admin.service';
import { RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { Subject, Subscription } from 'rxjs';
import { debounceTime, distinctUntilChanged } from 'rxjs/operators';

@Component({
  selector: 'app-passengers-list',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule],
  templateUrl: './passengers-list.component.html',
})
export class PassengersListComponent implements OnInit, OnDestroy {
  // FIX: Made public to allow template access for conditional messages
  public allPassengers: any[] = []; 
  public filteredPassengers: any[] = [];

  isLoading = true;
  paginationInfo: any = null;

  pageSize = 10;
  availablePageSizes = [10, 25, 50, 100];
  
  searchQuery: string = '';
  public searchSubject = new Subject<string>();
  private searchSubscription?: Subscription;

  constructor(private adminService: AdminService) { }

  ngOnInit(): void {
    this.loadPassengersFromServer();

    this.searchSubscription = this.searchSubject.pipe(
      debounceTime(300),
      distinctUntilChanged()
    ).subscribe(query => {
      this.filterPassengersLocally(query);
    });
  }

  ngOnDestroy(): void {
    this.searchSubscription?.unsubscribe();
  }

  loadPassengersFromServer(): void {
    this.isLoading = true;
    // Using a large page size to fetch all data for client-side filtering.
    // This is not ideal for very large datasets.
    this.adminService.getAllPassengers(1, 1000, '').subscribe({
      next: (response) => {
        this.allPassengers = response.data.items;
        this.filterPassengersLocally(''); // Apply initial filter (which shows all)
        this.paginationInfo = response.data;
        this.isLoading = false;
      },
      error: (err) => {
        console.error('Error fetching passenger data:', err);
        this.isLoading = false;
      }
    });
  }

  filterPassengersLocally(query: string): void {
    const searchTerm = query.toLowerCase().trim();

    if (!searchTerm) {
      this.filteredPassengers = this.allPassengers;
    } else {
      this.filteredPassengers = this.allPassengers.filter(passenger => {
        const nameMatch = passenger.name?.toLowerCase().includes(searchTerm);
        const emailMatch = passenger.email?.toLowerCase().includes(searchTerm);
        return nameMatch || emailMatch;
      });
    }
    // Note: We are not updating paginationInfo here as it would be inaccurate.
  }

  onSearchClick(): void {
    this.filterPassengersLocally(this.searchQuery);
  }

  // --- FIX: ADDED MISSING METHODS BACK ---

  onPageSizeChange(): void {
    // In client-side mode, changing page size doesn't require a server reload.
    // This function is kept for template compatibility but could be enhanced
    // to implement client-side pagination if needed. For now, it does nothing.
    console.log('Page size changed to:', this.pageSize);
  }

  nextPage(): void {
    // Pagination is not accurate with client-side filtering.
    // This is a placeholder.
    console.log('Next page clicked (client-side search).');
  }

  prevPage(): void {
    // Pagination is not accurate with client-side filtering.
    // This is a placeholder.
    console.log('Previous page clicked (client-side search).');
  }
}
