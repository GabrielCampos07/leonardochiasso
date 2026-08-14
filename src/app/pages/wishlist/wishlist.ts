import { Component, inject, OnInit } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../core/auth.service';
import { CartService } from '../../core/cart.service';
import { ChromeService } from '../../core/chrome.service';
import { COLLECTION_SLUGS, ROUTES, collectionPath, productPath } from '../../core/routes';
import { PRICES_ON_REQUEST, displayPriceLabel } from '../../core/pricing';
import { WishlistService } from '../../core/wishlist.service';
import { LcButton } from '../../shared/components/button/button';

@Component({
  selector: 'lc-wishlist-page',
  standalone: true,
  imports: [RouterLink, LcButton],
  templateUrl: './wishlist.html',
  styleUrl: './wishlist.scss',
})
export class WishlistPage implements OnInit {
  readonly wishlist = inject(WishlistService);
  readonly auth = inject(AuthService);
  private readonly cart = inject(CartService);
  private readonly chrome = inject(ChromeService);
  private readonly router = inject(Router);

  readonly home = ROUTES.home;
  readonly loginRoute = ROUTES.login;
  readonly accountRoute = ROUTES.account;
  readonly collectionRoute = collectionPath(COLLECTION_SLUGS.organicDreams);
  readonly productPath = productPath;
  readonly pricesOnRequest = PRICES_ON_REQUEST;
  readonly priceLabel = displayPriceLabel;

  ngOnInit(): void {
    this.chrome.setActive('default');
  }

  signOut(): void {
    this.auth.logout().subscribe({
      next: () => void this.router.navigateByUrl(ROUTES.account),
    });
  }

  remove(productId: string): void {
    this.wishlist.remove(productId);
  }

  addToBag(productId: string): void {
    this.cart.add(productId);
  }
}
