import { Routes } from '@angular/router';
import { ContactsComponent } from './components/contacts/contacts.component';
import { ComposerComponent } from './components/composer/composer.component';
import { SettingsComponent } from './components/settings/settings.component';

export const routes: Routes = [
  { path: '', redirectTo: 'composer', pathMatch: 'full' },
  { path: 'contacts', component: ContactsComponent },
  { path: 'composer', component: ComposerComponent },
  { path: 'settings', component: SettingsComponent }
];
