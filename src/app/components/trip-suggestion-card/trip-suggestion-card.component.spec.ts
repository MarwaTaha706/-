import { ComponentFixture, TestBed } from '@angular/core/testing';

import { TripSuggestionCardComponent } from './trip-suggestion-card.component';

describe('TripSuggestionCardComponent', () => {
  let component: TripSuggestionCardComponent;
  let fixture: ComponentFixture<TripSuggestionCardComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TripSuggestionCardComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(TripSuggestionCardComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
