import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { WhatsAppService, WaConfig } from '../../services/whatsapp.service';

@Component({
  selector: 'app-settings',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './settings.component.html',
  styleUrl: './settings.component.css'
})
export class SettingsComponent implements OnInit {
  private waService = inject(WhatsAppService);

  config: WaConfig = { phoneNumberId: '', accessToken: '' };
  saved = false;

  ngOnInit(): void {
    this.config = this.waService.getConfig();
  }

  save(): void {
    this.waService.saveConfig(this.config);
    this.saved = true;
    setTimeout(() => (this.saved = false), 2500);
  }
}
