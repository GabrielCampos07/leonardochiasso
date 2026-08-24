import { Component, inject, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import {
  AccountApiService,
  AddressDto,
} from '../../core/account-api.service';
import { AuthService, authErrorMessage } from '../../core/auth.service';
import { ChromeService } from '../../core/chrome.service';
import {
  COLLECTION_SLUGS,
  ROUTES,
  aboutPath,
  collectionPath,
  legalPath,
} from '../../core/routes';
import { WishlistService } from '../../core/wishlist.service';
import { ConfirmService } from '../../core/feedback/confirm.service';
import { ToastService } from '../../core/feedback/toast.service';

@Component({
  selector: 'lc-account-page',
  standalone: true,
  imports: [FormsModule, RouterLink],
  templateUrl: './account.html',
  styleUrl: './account.scss',
})
export class AccountPage implements OnInit {
  readonly auth = inject(AuthService);
  readonly wishlist = inject(WishlistService);
  private readonly accountApi = inject(AccountApiService);
  private readonly chrome = inject(ChromeService);
  private readonly router = inject(Router);
  private readonly confirm = inject(ConfirmService);
  private readonly toast = inject(ToastService);

  readonly home = ROUTES.home;
  readonly login = ROUTES.login;
  readonly register = ROUTES.register;
  readonly wishlistRoute = ROUTES.wishlist;
  readonly ordersRoute = ROUTES.orders;
  readonly collectionRoute = collectionPath(COLLECTION_SLUGS.organicDreams);
  readonly aboutRoute = aboutPath();
  readonly privacyRoute = legalPath('privacidade');
  readonly termsRoute = legalPath('termos');
  readonly cookiesRoute = legalPath('cookies');
  readonly contactHref = 'mailto:Contact@leonardochiasso.com';

  readonly editingEmail = signal(false);
  emailDraft = '';
  emailPassword = '';
  readonly emailBusy = signal(false);
  readonly emailError = signal('');
  readonly emailOk = signal('');

  profileCpf = '';
  profilePhone = '';
  readonly profileBusy = signal(false);
  readonly profileError = signal('');
  readonly profileOk = signal('');

  readonly addresses = signal<AddressDto[]>([]);
  readonly addressBusy = signal(false);
  readonly addressError = signal('');
  readonly addressOk = signal('');
  readonly showAddressForm = signal(false);
  editingAddressId: string | null = null;
  addrLabel = '';
  addrCep = '';
  addrStreet = '';
  addrNumber = '';
  addrComplement = '';
  addrDistrict = '';
  addrCity = '';
  addrState = '';
  addrDefault = false;

  currentPassword = '';
  newPassword = '';
  confirmPassword = '';
  readonly passwordBusy = signal(false);
  readonly passwordError = signal('');
  readonly passwordOk = signal('');

  ngOnInit(): void {
    this.chrome.setActive('default');
    if (this.auth.user()) {
      this.loadProfileExtras();
    }
  }

  private loadProfileExtras(): void {
    this.accountApi.getProfile().subscribe({
      next: (p) => {
        this.profileCpf = p.cpf ?? '';
        this.profilePhone = p.phone ?? '';
        this.auth.applyUser({
          id: p.id,
          email: p.email,
          name: p.name,
          cpf: p.cpf,
          phone: p.phone,
        });
      },
    });
    this.reloadAddresses();
  }

  reloadAddresses(): void {
    this.accountApi.listAddresses().subscribe({
      next: (list) => this.addresses.set(list),
    });
  }

  saveProfileContact(): void {
    this.profileError.set('');
    this.profileOk.set('');
    const cpf = this.profileCpf.replace(/\D/g, '');
    const phone = this.profilePhone.replace(/\D/g, '');
    if (cpf && cpf.length !== 11) {
      this.profileError.set('Informe um CPF válido.');
      return;
    }
    if (phone && (phone.length < 10 || phone.length > 13)) {
      this.profileError.set('Informe um telefone válido (DDD + número).');
      return;
    }
    this.profileBusy.set(true);
    const body: { cpf?: string; phone?: string } = {};
    if (cpf) body.cpf = cpf;
    if (phone) body.phone = phone;
    this.accountApi.updateProfile(body).subscribe({
      next: () => {
        this.profileBusy.set(false);
        this.profileOk.set('Dados atualizados.');
      },
      error: (err: unknown) => {
        this.profileBusy.set(false);
        this.profileError.set(
          authErrorMessage(err, 'Não foi possível salvar CPF/telefone.'),
        );
      },
    });
  }

  startNewAddress(): void {
    this.editingAddressId = null;
    this.addrLabel = '';
    this.addrCep = '';
    this.addrStreet = '';
    this.addrNumber = '';
    this.addrComplement = '';
    this.addrDistrict = '';
    this.addrCity = '';
    this.addrState = '';
    this.addrDefault = this.addresses().length === 0;
    this.addressError.set('');
    this.addressOk.set('');
    this.showAddressForm.set(true);
  }

  startEditAddress(a: AddressDto): void {
    this.editingAddressId = a.id;
    this.addrLabel = a.label ?? '';
    this.addrCep = a.cep;
    this.addrStreet = a.street;
    this.addrNumber = a.number;
    this.addrComplement = a.complement ?? '';
    this.addrDistrict = a.district;
    this.addrCity = a.city;
    this.addrState = a.state;
    this.addrDefault = a.isDefault;
    this.addressError.set('');
    this.addressOk.set('');
    this.showAddressForm.set(true);
  }

  cancelAddressForm(): void {
    this.showAddressForm.set(false);
    this.editingAddressId = null;
  }

  saveAddress(): void {
    this.addressError.set('');
    this.addressOk.set('');
    this.addressBusy.set(true);
    const body = {
      label: this.addrLabel || null,
      cep: this.addrCep,
      street: this.addrStreet,
      number: this.addrNumber,
      complement: this.addrComplement || null,
      district: this.addrDistrict,
      city: this.addrCity,
      state: this.addrState.toUpperCase(),
      isDefault: this.addrDefault,
    };
    const req = this.editingAddressId
      ? this.accountApi.updateAddress(this.editingAddressId, body)
      : this.accountApi.createAddress(body);

    req.subscribe({
      next: () => {
        this.addressBusy.set(false);
        this.showAddressForm.set(false);
        this.addressOk.set('Endereço salvo.');
        this.reloadAddresses();
      },
      error: (err: unknown) => {
        this.addressBusy.set(false);
        this.addressError.set(
          authErrorMessage(err, 'Não foi possível salvar o endereço.'),
        );
      },
    });
  }

  async removeAddress(id: string): Promise<void> {
    const ok = await this.confirm.confirm({
      title: 'Remover endereço',
      message: 'Remover este endereço? Esta ação não pode ser desfeita.',
      confirmLabel: 'Remover',
      destructive: true,
    });
    if (!ok) return;

    this.addressError.set('');
    this.accountApi.deleteAddress(id).subscribe({
      next: () => {
        this.addressOk.set('Endereço removido.');
        this.toast.success('Endereço removido.');
        this.reloadAddresses();
      },
      error: (err: unknown) => {
        this.addressError.set(
          authErrorMessage(err, 'Não foi possível remover o endereço.'),
        );
        this.toast.error(authErrorMessage(err, 'Não foi possível remover o endereço.'));
      },
    });
  }

  formatAddress(a: AddressDto): string {
    return `${a.street}, ${a.number} — ${a.city}/${a.state}`;
  }

  startEditEmail(): void {
    const user = this.auth.user();
    if (!user) return;
    this.emailDraft = user.email;
    this.emailPassword = '';
    this.emailError.set('');
    this.emailOk.set('');
    this.editingEmail.set(true);
  }

  cancelEditEmail(): void {
    this.editingEmail.set(false);
    this.emailPassword = '';
    this.emailError.set('');
  }

  saveEmail(): void {
    this.emailError.set('');
    this.emailOk.set('');
    this.emailBusy.set(true);
    this.auth
      .changeEmail({
        email: this.emailDraft,
        currentPassword: this.emailPassword,
      })
      .subscribe({
        next: () => {
          this.emailBusy.set(false);
          this.emailPassword = '';
          this.editingEmail.set(false);
          this.emailOk.set('E-mail atualizado.');
        },
        error: (err: unknown) => {
          this.emailBusy.set(false);
          this.emailError.set(
            authErrorMessage(err, 'Não foi possível atualizar o e-mail.'),
          );
        },
      });
  }

  signOut(): void {
    this.auth.logout().subscribe({
      next: () => void this.router.navigateByUrl(ROUTES.home),
    });
  }

  changePassword(): void {
    this.passwordError.set('');
    this.passwordOk.set('');

    if (this.newPassword.length < 8) {
      this.passwordError.set('A nova senha deve ter ao menos 8 caracteres.');
      return;
    }
    if (this.newPassword !== this.confirmPassword) {
      this.passwordError.set('A confirmação não confere com a nova senha.');
      return;
    }

    this.passwordBusy.set(true);
    this.auth
      .changePassword({
        currentPassword: this.currentPassword,
        newPassword: this.newPassword,
      })
      .subscribe({
        next: () => {
          this.passwordBusy.set(false);
          this.currentPassword = '';
          this.newPassword = '';
          this.confirmPassword = '';
          this.passwordOk.set('Senha atualizada.');
        },
        error: (err: unknown) => {
          this.passwordBusy.set(false);
          this.passwordError.set(
            authErrorMessage(err, 'Não foi possível atualizar a senha.'),
          );
        },
      });
  }
}
