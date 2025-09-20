// src/app/layout/layout.component.ts
import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { NavbarComponent } from '../components/navbar/navbar.component'; // Check path
import { FooterComponent } from '../components/footer/footer.component'; // Check path

@Component({
  selector: 'app-layout', // Correct selector for this component
  standalone: true,
  imports: [
    RouterOutlet,
    NavbarComponent,
    FooterComponent
  ],
  templateUrl: './layout.component.html',
  styleUrl: './layout.component.css'
})
export class LayoutComponent {
  // No logic needed here for the layout itself
}
