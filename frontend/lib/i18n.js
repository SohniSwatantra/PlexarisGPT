"use client";

import { createContext, useContext, useEffect, useMemo, useState } from 'react';

const I18nContext = createContext({ t: (k) => k, locale: 'nl', setLocale: () => {} });

const DICTS = {
  nl: {
    // Common
    plexaris: 'Plexaris',
    customerPortal: 'Klantportaal',
    loading: 'Laden...',
    back: '← Terug',
    
    // Login
    signIn: 'Aanmelden',
    enterCustomerId: 'Voer uw klant-ID in om door te gaan',
    customerId: 'Klant-ID',
    continue: 'Doorgaan',
    pleaseEnterCustomerId: 'Voer uw klant-ID in',
    
    // Shop
    browseSuppliers: 'Leveranciers bekijken',
    suppliers: 'leveranciers',
    noSuppliersYet: 'Nog geen leveranciers beschikbaar.',
    checkBackSoon: 'Kom binnenkort terug voor geselecteerde partners!',
    curatedCatalog: 'Gecureerde catalogus • Stem-ondersteunde winkelen',
    browseProducts: 'Producten bekijken',
    
    // Supplier
    loadingSupplier: 'Leverancier laden…',
    hi: 'Hoi',
    welcomeTo: 'Welkom bij',
    welcomeChat: 'Welkom bij onze winkelassistent!',
    whatLookingFor: 'Wat zoekt u vandaag? Ik kan u helpen met het vinden van items, het beantwoorden van vragen en het toevoegen van producten aan uw winkelwagen.',
    typeSomething: 'Typ iets...',
    send: 'Versturen',
    viewCart: 'Winkelwagen',
    items: 'items',
    chat: 'Chat',
    browse: 'Bladeren',
    add: 'Toevoegen',
    
    // Cart
    yourCart: 'Uw winkelwagen',
    cartEmpty: 'Uw winkelwagen is leeg',
    addItemsToStart: 'Voeg items toe vanuit de chat om te beginnen',
    subtotal: 'Subtotaal',
    vat: 'BTW (21%)',
    total: 'Totaal',
    proceedToCheckout: 'Doorgaan naar kassa',
    
    // Checkout
    checkout: 'Kassa',
    loadingCheckout: 'Kassa laden…',
    orderSummary: 'Besteloverzicht',
    noItemsInOrder: 'Geen items in uw bestelling',
    quantity: 'Hoeveelheid',
    placeOrder: 'Bestelling plaatsen',
    processing: 'Verwerken...',
    
    // Dashboard
    logout: 'Uitloggen',
    orders: 'Bestellingen',
    yourOrderHistory: 'Uw bestelgeschiedenis',
    noOrdersYet: 'Nog geen bestellingen.',
    startBrowsing: 'Begin met browsen en plaats uw eerste bestelling!',
    orderDate: 'Besteldatum',
    status: 'Status',
    pending: 'In behandeling',
    completed: 'Voltooid',
    
    // Settings
    settings: 'Instellingen',
    language: 'Taal',
    backToDashboard: 'Terug naar dashboard',
    businessProfile: 'Bedrijfsprofiel',
    businessLogo: 'Bedrijfslogo',
  },
  en: {
    // Common
    plexaris: 'Plexaris',
    customerPortal: 'Customer Portal',
    loading: 'Loading...',
    back: '← Back',
    
    // Login
    signIn: 'Sign in',
    enterCustomerId: 'Enter your customer ID to continue',
    customerId: 'Customer ID',
    continue: 'Continue',
    pleaseEnterCustomerId: 'Please enter your customer ID',
    
    // Shop
    browseSuppliers: 'Browse Suppliers',
    suppliers: 'suppliers',
    noSuppliersYet: 'No suppliers available yet.',
    checkBackSoon: 'Check back soon for curated partners!',
    curatedCatalog: 'Curated catalog • Voice-assisted shopping',
    browseProducts: 'Browse Products',
    
    // Supplier
    loadingSupplier: 'Loading supplier…',
    hi: 'Hi',
    welcomeTo: 'Welcome to',
    welcomeChat: 'Welcome to our shopping assistant!',
    whatLookingFor: 'What are you looking for today? I can help you find items, answer questions, and add products to your cart.',
    typeSomething: 'Type something...',
    send: 'Send',
    viewCart: 'Cart',
    items: 'items',
    chat: 'Chat',
    browse: 'Browse',
    add: 'Add',
    
    // Cart
    yourCart: 'Your Cart',
    cartEmpty: 'Your cart is empty',
    addItemsToStart: 'Add items from the chat to get started',
    subtotal: 'Subtotal',
    vat: 'VAT (21%)',
    total: 'Total',
    proceedToCheckout: 'Proceed to Checkout',
    
    // Checkout
    checkout: 'Checkout',
    loadingCheckout: 'Loading checkout…',
    orderSummary: 'Order Summary',
    noItemsInOrder: 'No items in your order',
    quantity: 'Quantity',
    placeOrder: 'Place Order',
    processing: 'Processing...',
    
    // Dashboard
    logout: 'Logout',
    orders: 'Orders',
    yourOrderHistory: 'Your Order History',
    noOrdersYet: 'No orders yet.',
    startBrowsing: 'Start browsing and place your first order!',
    orderDate: 'Order Date',
    status: 'Status',
    pending: 'Pending',
    completed: 'Completed',
    
    // Settings
    settings: 'Settings',
    language: 'Language',
    backToDashboard: 'Back to Dashboard',
    businessProfile: 'Business Profile',
    businessLogo: 'Business Logo',
  },
};

export function I18nProvider({ children }) {
  const [locale, setLocale] = useState('en');

  useEffect(() => {
    const saved = typeof window !== 'undefined' ? localStorage.getItem('locale') : null;
    if (saved && DICTS[saved]) {
      setLocale(saved);
    }
  }, []);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('locale', locale);
    }
  }, [locale]);

  const t = useMemo(() => {
    const dict = DICTS[locale] || DICTS.en;
    return (key) => dict[key] || key;
  }, [locale]);

  const value = useMemo(() => ({ t, locale, setLocale }), [t, locale]);
  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n() {
  return useContext(I18nContext);
}
