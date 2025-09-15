

import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute} from '@angular/router';
import { AdminService } from '../services/admin.service';
import { switchMap, map, catchError, tap } from 'rxjs/operators';
import { Observable, of } from 'rxjs';
import { API_BASE_URL } from '../api'; 

@Component({
  selector: 'app-driver-details',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './driver-details.component.html',
  styleUrls: ['./driver-details.component.css']
})
export class DriverDetailsComponent implements OnInit {
  driverDetails$: Observable<any> | undefined;
  isLoading = true;
  error: string | null = null;

  constructor(
    private route: ActivatedRoute,
    private adminService: AdminService
  ) { }

  ngOnInit(): void {
    this.loadDriverDetails();
  }

  
  loadDriverDetails(): void {
    this.driverDetails$ = this.route.paramMap.pipe(
      switchMap(params => {
        const driverId = params.get('id');
        if (driverId) {
          this.isLoading = true;
          this.error = null;
          return this.adminService.getDriverDetailsById(driverId).pipe(
            map(response => {
              const details = response.data;
              
             
              if (details) {
                
                details.userImagePath = this.toAbsoluteUrl(details.userImagePath);

               
                if (details.vehicleDetails?.imageURLs) {
                  details.vehicleDetails.imageURLs = details.vehicleDetails.imageURLs.map((url: string) => this.toAbsoluteUrl(url));
                }

                // Transform verification document URLs
                if (details.verificationDocument) {
                  details.verificationDocument.forEach((doc: any) => {
                    if (doc.documentURLs) {
                      doc.documentURLs = doc.documentURLs.map((url: string) => this.toAbsoluteUrl(url));
                    }
                  });
                }
              }
              return details; 
            }),
            tap(() => this.isLoading = false), 
            catchError(err => {
              console.error("Error fetching driver details:", err);
              this.error = "Failed to load driver details. Please try again.";
              this.isLoading = false;
              return of(null);
            })
          );
        }
        this.error = "Driver ID not found in URL.";
        this.isLoading = false;
        return of(null);
      })
    );
  }


  private toAbsoluteUrl(url: string | null): string | null {
    if (!url || url.startsWith('http' )) {
      return url; 
    }
   
    const domain = API_BASE_URL.split('/api' )[0]; 
    const path = url.startsWith('/') ? url : `/${url}`;
    return `${domain}${path}`;
  }


  verifyDriver(driverId: string): void {
    if (!confirm("هل أنت متأكد من أنك تريد توثيق هذا السائق؟")) return;

    this.adminService.verifyDriverById(driverId).subscribe({
      next: () => {
        alert("تم توثيق السائق بنجاح!");
        this.loadDriverDetails(); 
      },
      error: (err) => {
        alert("فشل توثيق السائق. يرجى مراجعة الكونسول.");
        console.error(err);
      }
    });
  }

  verifyDocument(documentId: string): void {
    if (!confirm("هل أنت متأكد من أنك تريد توثيق هذا المستند؟")) return;

    this.adminService.verifyDocumentById(documentId).subscribe({
      next: () => {
        alert("تم توثيق المستند بنجاح!");
        this.loadDriverDetails(); 
      },
      error: (err) => {
        alert("فشل توثيق المستند.");
        console.error(err);
      }
    });
  }
}
