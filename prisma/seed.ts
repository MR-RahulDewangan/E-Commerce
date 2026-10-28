import { PrismaClient, Role } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();
const SALT_ROUNDS = 12;

async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, SALT_ROUNDS);
}

async function main() {
  console.log('🌿 Starting Luxury, Eco-Friendly & Handcrafted Database Reset & Seeding...');

  // -------------------------------------------------------------
  // 1. CLEANUP ALL EXISTING ITEMS FROM DATABASE
  // -------------------------------------------------------------
  console.log('🧹 Purging old catalog, variants, and dependent transactions...');
  await prisma.cartItem.deleteMany({});
  await prisma.wishlistItem.deleteMany({});
  await prisma.stockReservation.deleteMany({});
  await prisma.paymentTransaction.deleteMany({});
  await prisma.orderItem.deleteMany({});
  await prisma.order.deleteMany({});
  await prisma.productImage.deleteMany({});
  await prisma.productVariant.deleteMany({});
  await prisma.product.deleteMany({});
  await prisma.category.deleteMany({});
  console.log('✨ All old items purged successfully from database.');

  // -------------------------------------------------------------
  // 2. SEED SYSTEM ADMIN & VERIFIED ARTISAN SELLERS
  // -------------------------------------------------------------
  const adminPasswordHash = await hashPassword('AdminSecure2026!');
  const admin = await prisma.user.upsert({
    where: { email: 'admin@ecommerce.example.in' },
    update: {
      role: Role.ADMIN,
      firstName: 'Maison',
      lastName: 'Curator',
    },
    create: {
      email: 'admin@ecommerce.example.in',
      passwordHash: adminPasswordHash,
      firstName: 'Maison',
      lastName: 'Curator',
      role: Role.ADMIN,
      phoneNumber: '+919876543200',
    },
  });
  console.log(`👤 Admin user verified: ${admin.email}`);

  const customerPasswordHash = await hashPassword('CustomerPass123!');
  const customer = await prisma.user.upsert({
    where: { email: 'customer@ecommerce.example.in' },
    update: {
      firstName: 'Pooja',
      lastName: 'Sharma',
    },
    create: {
      email: 'customer@ecommerce.example.in',
      passwordHash: customerPasswordHash,
      firstName: 'Pooja',
      lastName: 'Sharma',
      role: Role.CUSTOMER,
      phoneNumber: '+919876543210',
    },
  });

  // Default Customer Address
  await prisma.address.deleteMany({ where: { userId: customer.id } });
  await prisma.address.create({
    data: {
      userId: customer.id,
      recipientName: 'Pooja Sharma',
      phoneNumber: '+919876543210',
      streetLine1: 'Flat 402, Lotus Towers, 100ft Road',
      streetLine2: 'Indiranagar',
      city: 'Bengaluru',
      stateProvince: 'Karnataka',
      postalCode: '560038',
      countryCode: 'IN',
      isDefault: true,
    },
  });

  const sellerPasswordHash = await hashPassword('SellerSecure2026!');

  // Seller 1: Kashmir Artisans Guild
  const seller1User = await prisma.user.upsert({
    where: { email: 'seller.kashmir@ecommerce.example.in' },
    update: { role: Role.SELLER, firstName: 'Tariq', lastName: 'Ahmad' },
    create: {
      email: 'seller.kashmir@ecommerce.example.in',
      passwordHash: sellerPasswordHash,
      firstName: 'Tariq',
      lastName: 'Ahmad',
      role: Role.SELLER,
      phoneNumber: '+919876543221',
    },
  });

  const seller1Profile = await prisma.sellerProfile.upsert({
    where: { userId: seller1User.id },
    update: {
      storeName: 'Kashmir Master Weavers Guild',
      storeSlug: 'kashmir-master-weavers',
      description: 'Certified GI-tagged Kashmiri Pashmina, hand-needle Sozni embroidery, and organic Himalayan cashmere.',
      gstin: '01ABCDE1234F1Z5',
      pan: 'ABCDE1234F',
      bankAccount: '9876543210123',
      bankIfsc: 'SBIN0001234',
      commissionRate: 10.0,
      isVerified: true,
    },
    create: {
      userId: seller1User.id,
      storeName: 'Kashmir Master Weavers Guild',
      storeSlug: 'kashmir-master-weavers',
      description: 'Certified GI-tagged Kashmiri Pashmina, hand-needle Sozni embroidery, and organic Himalayan cashmere.',
      gstin: '01ABCDE1234F1Z5',
      pan: 'ABCDE1234F',
      bankAccount: '9876543210123',
      bankIfsc: 'SBIN0001234',
      commissionRate: 10.0,
      isVerified: true,
    },
  });

  // Seller 2: Jaipur Heritage Handlooms
  const seller2User = await prisma.user.upsert({
    where: { email: 'seller.jaipur@ecommerce.example.in' },
    update: { role: Role.SELLER, firstName: 'Rajesh', lastName: 'Meena' },
    create: {
      email: 'seller.jaipur@ecommerce.example.in',
      passwordHash: sellerPasswordHash,
      firstName: 'Rajesh',
      lastName: 'Meena',
      role: Role.SELLER,
      phoneNumber: '+919876543222',
    },
  });

  const seller2Profile = await prisma.sellerProfile.upsert({
    where: { userId: seller2User.id },
    update: {
      storeName: 'Jaipur Eco Heritage Atelier',
      storeSlug: 'jaipur-eco-atelier',
      description: 'Organic natural plant-dyed Dabu block prints, cruelty-free Ahimsa silks, and hand-beaten bronze tableware.',
      gstin: '08FGHIJ5678K1Z2',
      pan: 'FGHIJ5678K',
      bankAccount: '1234567890987',
      bankIfsc: 'HDFC0005678',
      commissionRate: 10.0,
      isVerified: true,
    },
    create: {
      userId: seller2User.id,
      storeName: 'Jaipur Eco Heritage Atelier',
      storeSlug: 'jaipur-eco-atelier',
      description: 'Organic natural plant-dyed Dabu block prints, cruelty-free Ahimsa silks, and hand-beaten bronze tableware.',
      gstin: '08FGHIJ5678K1Z2',
      pan: 'FGHIJ5678K',
      bankAccount: '1234567890987',
      bankIfsc: 'HDFC0005678',
      commissionRate: 10.0,
      isVerified: true,
    },
  });

  // -------------------------------------------------------------
  // 3. SEED 6 ECO-FRIENDLY & LUXURY HANDCRAFTED CATEGORIES
  // -------------------------------------------------------------
  const categoriesData = [
    {
      name: 'Artisanal Handlooms & Silks',
      slug: 'artisanal-handlooms',
      imageUrl: 'https://images.unsplash.com/photo-1610030469983-98e550d6193c?auto=format&fit=crop&w=1200&q=80',
      sortOrder: 1,
    },
    {
      name: 'Eco Cashmere & Pashmina',
      slug: 'pashmina-shawls',
      imageUrl: 'https://images.unsplash.com/photo-1608256246200-53e635b5b65f?auto=format&fit=crop&w=1200&q=80',
      sortOrder: 2,
    },
    {
      name: 'Heritage Handcrafted Jewellery',
      slug: 'handcrafted-jewellery',
      imageUrl: 'https://images.unsplash.com/photo-1535632066927-ab7c9ab60908?auto=format&fit=crop&w=1200&q=80',
      sortOrder: 3,
    },
    {
      name: 'Organic Khadi & Ahimsa Cotton',
      slug: 'organic-khadi',
      imageUrl: 'https://images.unsplash.com/photo-1583391733956-3750e0ff4e8b?auto=format&fit=crop&w=1200&q=80',
      sortOrder: 4,
    },
    {
      name: 'Sustainable Living & Decor',
      slug: 'sustainable-decor',
      imageUrl: 'https://images.unsplash.com/photo-1583847268964-b28dc8f51f92?auto=format&fit=crop&w=1200&q=80',
      sortOrder: 5,
    },
    {
      name: 'Botanical Wellness & Pure Aromas',
      slug: 'botanical-wellness',
      imageUrl: 'https://images.unsplash.com/photo-1608571423902-eed4a5ad8108?auto=format&fit=crop&w=1200&q=80',
      sortOrder: 6,
    },
  ];

  const categoryMap: Record<string, string> = {};
  for (const catData of categoriesData) {
    const category = await prisma.category.create({
      data: catData,
    });
    categoryMap[catData.slug] = category.id;
  }
  console.log(`📁 6 luxury handcrafted categories created.`);

  // -------------------------------------------------------------
  // 4. SEED 18 AUTHENTIC, HANDCRAFTED, ECO-FRIENDLY LUXURY PRODUCTS
  // -------------------------------------------------------------
  const productsData = [
    // --- Category 1: Artisanal Handlooms & Silks ---
    {
      categorySlug: 'artisanal-handlooms',
      name: 'Pure Banarasi Katan Silk Saree',
      slug: 'imperial-banarasi-katan-silk-saree',
      description: 'Handwoven in Varanasi using traditional pit looms. Crafted from pure mulberry silk and electro-refined zari with intricate Kadwa borders. An authentic heirloom saree celebrating classic Indian festive elegance.',
      basePrice: 3499.0,
      isPublished: true,
      isFeatured: true,
      sellerId: seller2Profile.id,
      imageUrl: 'https://images.unsplash.com/photo-1610030469983-98e550d6193c?auto=format&fit=crop&w=1000&q=80',
      variants: [
        { sku: 'BAN-KAT-GLD', name: 'Royal Gold Zari Border', stock: 6, color: 'Gold Amber', priceOverride: 3499.0 },
        { sku: 'BAN-KAT-SLV', name: 'Moonlit Silver Zari Border', stock: 4, color: 'Moonlit Silver', priceOverride: 3799.0 },
        { sku: 'BAN-KAT-RBY', name: 'Deep Ruby Meenakari Zari', stock: 5, color: 'Deep Ruby', priceOverride: 3999.0 },
      ],
    },
    {
      categorySlug: 'artisanal-handlooms',
      name: 'Chanderi Silk Cotton Anarkali Kurti',
      slug: 'chanderi-silk-cotton-royal-angrakha',
      description: 'Handwoven Chanderi weave with traditional hand-block Ajrakh motifs. Crafted from breathable cotton-silk blend with natural plant dyes. Finished with delicate coconut shell buttons for everyday festive comfort.',
      basePrice: 1499.0,
      isPublished: true,
      isFeatured: true,
      sellerId: seller2Profile.id,
      imageUrl: 'https://images.unsplash.com/photo-1617627143750-d86bc21e42bb?auto=format&fit=crop&w=1000&q=80',
      variants: [
        { sku: 'CHN-ANG-S', name: 'Small (36) / Indigo Blue', stock: 8, size: 'S', color: 'Indigo Blue' },
        { sku: 'CHN-ANG-M', name: 'Medium (38) / Indigo Blue', stock: 12, size: 'M', color: 'Indigo Blue' },
        { sku: 'CHN-ANG-L', name: 'Large (40) / Indigo Blue', stock: 9, size: 'L', color: 'Indigo Blue' },
      ],
    },
    {
      categorySlug: 'artisanal-handlooms',
      name: 'Patan Patola Silk Double Ikat Dupatta',
      slug: 'patan-patola-double-ikat-scarf',
      description: 'Traditional Patola weave inspired by Gujarat heritage. Features vibrant geometric floral motifs woven with dyed natural threads. Reversible and lightweight with graceful zari borders.',
      basePrice: 1899.0,
      isPublished: true,
      isFeatured: false,
      sellerId: seller2Profile.id,
      imageUrl: 'https://images.unsplash.com/photo-1584917865442-de89df76afd3?auto=format&fit=crop&w=1000&q=80',
      variants: [
        { sku: 'PAT-PAT-STD', name: 'Standard Weave (2.2m)', stock: 5, size: 'Standard' },
        { sku: 'PAT-PAT-ZAR', name: 'Rich Zari Pallu (2.5m)', stock: 3, size: 'Grand', priceOverride: 2199.0 },
      ],
    },

    // --- Category 2: Eco Cashmere & Pashmina ---
    {
      categorySlug: 'pashmina-shawls',
      name: 'Kashmiri Hand-Embroidered Pashmina Shawl',
      slug: 'master-artisan-sozni-pashmina',
      description: 'Authentic Kashmiri Pashmina crafted with delicate hand needle Sozni embroidery along the borders. Feathery soft, lightweight, and offering warm insulation during cooler seasons.',
      basePrice: 3299.0,
      isPublished: true,
      isFeatured: true,
      sellerId: seller1Profile.id,
      imageUrl: 'https://images.unsplash.com/photo-1608256246200-53e635b5b65f?auto=format&fit=crop&w=1000&q=80',
      variants: [
        { sku: 'PAS-SOZ-IVY', name: 'Natural Ivory / Sozni Border', stock: 4, color: 'Natural Ivory', priceOverride: 3299.0 },
        { sku: 'PAS-SOZ-WAL', name: 'Walnut Charcoal / Full Jaal', stock: 3, color: 'Walnut Charcoal', priceOverride: 3699.0 },
      ],
    },
    {
      categorySlug: 'pashmina-shawls',
      name: 'Authentic Kashmiri Kani Wool Shawl',
      slug: 'hand-spun-reversible-kani-shawl',
      description: 'Woven on traditional Kashmiri wooden looms with vibrant multi-colored paisley (badam) and floral motifs. Soft touch and warm drape for formal wear and weddings.',
      basePrice: 2799.0,
      isPublished: true,
      isFeatured: true,
      sellerId: seller1Profile.id,
      imageUrl: 'https://images.unsplash.com/photo-1544441893-675973e31985?auto=format&fit=crop&w=1000&q=80',
      variants: [
        { sku: 'PAS-KAN-FLR', name: 'Floral Chinar Motif (Ecru)', stock: 5, color: 'Pashmina Ecru' },
        { sku: 'PAS-KAN-CHV', name: 'Traditional Paisley Motif (Saffron)', stock: 4, color: 'Antique Saffron', priceOverride: 2999.0 },
      ],
    },
    {
      categorySlug: 'pashmina-shawls',
      name: 'Pure Himalayan Soft Wool Stole & Throw',
      slug: 'undyed-himalayan-cashmere-throw',
      description: 'Natural undyed soft Himalayan wool woven in subtle herringbone twill with hand-twisted fringes. Gentle on the skin and cozy for evenings and travel.',
      basePrice: 1999.0,
      isPublished: true,
      isFeatured: false,
      sellerId: seller1Profile.id,
      imageUrl: 'https://images.unsplash.com/photo-1580301762395-21ce84d00bc6?auto=format&fit=crop&w=1000&q=80',
      variants: [
        { sku: 'PAS-THR-CLD', name: 'Cloud Grey (140cm x 200cm)', stock: 7, color: 'Cloud Grey' },
        { sku: 'PAS-THR-OAT', name: 'Warm Oatmeal (140cm x 200cm)', stock: 6, color: 'Dune Oatmeal' },
      ],
    },

    // --- Category 3: Heritage Handcrafted Jewellery ---
    {
      categorySlug: 'handcrafted-jewellery',
      name: 'Traditional Silver Temple Hasli Choker',
      slug: 'recycled-temple-silver-hasli-choker',
      description: 'Handcrafted solid brass with 925 sterling silver plating using ancient temple repoussé embossing. Finished with an antique oxidized patina for ethnic and bridal attire.',
      basePrice: 1499.0,
      isPublished: true,
      isFeatured: true,
      sellerId: seller2Profile.id,
      imageUrl: 'https://images.unsplash.com/photo-1535632066927-ab7c9ab60908?auto=format&fit=crop&w=1000&q=80',
      variants: [
        { sku: 'JWL-HAS-ANT', name: 'Antique Oxidized Finish', stock: 5, priceOverride: 1499.0 },
        { sku: 'JWL-HAS-MIR', name: 'Hand-Burnished Silver Luster', stock: 4, priceOverride: 1699.0 },
      ],
    },
    {
      categorySlug: 'handcrafted-jewellery',
      name: 'Handmade Bidriware Silver-Inlaid Kada',
      slug: 'bidriware-hand-inlaid-silver-cuff',
      description: 'Renowned 500-year-old metallic handicraft from Bidar, Karnataka. Pure silver wire is inlaid into engraved zinc-copper alloy, then oxidized black for a striking royal contrast.',
      basePrice: 1199.0,
      isPublished: true,
      isFeatured: false,
      sellerId: seller2Profile.id,
      imageUrl: 'https://images.unsplash.com/photo-1611591475878-5a2a97576571?auto=format&fit=crop&w=1000&q=80',
      variants: [
        { sku: 'JWL-BID-S', name: 'Size 2.4 (Small)', stock: 6, size: 'S' },
        { sku: 'JWL-BID-M', name: 'Size 2.6 (Medium)', stock: 8, size: 'M' },
        { sku: 'JWL-BID-L', name: 'Size 2.8 (Large)', stock: 5, size: 'L' },
      ],
    },
    {
      categorySlug: 'handcrafted-jewellery',
      name: 'Raw Green Tourmaline Hand-Carved Brass Ring',
      slug: 'uncut-tourmaline-handcrafted-brass-ring',
      description: 'Cast in pure architectural brass using traditional lost-wax methods. Features an authentic uncut raw green tourmaline gemstone set in organic hand-textured prongs. Adjustable band.',
      basePrice: 599.0,
      isPublished: true,
      isFeatured: false,
      sellerId: seller2Profile.id,
      imageUrl: 'https://images.unsplash.com/photo-1605100804763-247f67b3557e?auto=format&fit=crop&w=1000&q=80',
      variants: [
        { sku: 'JWL-RNG-SZ6', name: 'Size 12 (Adjustable)', stock: 7, size: '6' },
        { sku: 'JWL-RNG-SZ7', name: 'Size 14 (Adjustable)', stock: 10, size: '7' },
        { sku: 'JWL-RNG-SZ8', name: 'Size 16 (Adjustable)', stock: 6, size: '8' },
      ],
    },

    // --- Category 4: Organic Khadi & Ahimsa Cotton ---
    {
      categorySlug: 'organic-khadi',
      name: 'Handspun Ahimsa Silk Khadi Straight Kurti',
      slug: 'handspun-ahimsa-silk-khadi-tunic',
      description: 'Woven on village charkhas from organic rainfed cotton blended with peace Ahimsa silk. Breathable, sweat-absorbent, hypoallergenic, and detailed with wooden buttons.',
      basePrice: 1299.0,
      isPublished: true,
      isFeatured: true,
      sellerId: seller2Profile.id,
      imageUrl: 'https://images.unsplash.com/photo-1583391733956-3750e0ff4e8b?auto=format&fit=crop&w=1000&q=80',
      variants: [
        { sku: 'KHA-TUN-S', name: 'Small (36) / Natural Ivory', stock: 8, size: 'S', color: 'Ivory' },
        { sku: 'KHA-TUN-M', name: 'Medium (38) / Natural Ivory', stock: 12, size: 'M', color: 'Ivory' },
        { sku: 'KHA-TUN-L', name: 'Large (40) / Natural Ivory', stock: 7, size: 'L', color: 'Ivory' },
      ],
    },
    {
      categorySlug: 'organic-khadi',
      name: 'Indigo Dabu Hand-Block Pure Cotton Shrug',
      slug: 'indigo-dabu-hand-block-trench-robe',
      description: 'Handcrafted with traditional mud-resist Dabu block printing by artisan Chippas in Bagru, Rajasthan. Natural fermented indigo dye on 100% breathable organic cotton.',
      basePrice: 1199.0,
      isPublished: true,
      isFeatured: true,
      sellerId: seller2Profile.id,
      imageUrl: 'https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?auto=format&fit=crop&w=1000&q=80',
      variants: [
        { sku: 'KHA-ROB-SM', name: 'Size S-M (Bust 36-38 in)', stock: 9, size: 'S-M', color: 'Living Indigo' },
        { sku: 'KHA-ROB-LXL', name: 'Size L-XL (Bust 40-42 in)', stock: 6, size: 'L-XL', color: 'Living Indigo' },
      ],
    },
    {
      categorySlug: 'organic-khadi',
      name: 'Handwoven Bengal Jamdani Pure Muslin Kurti',
      slug: 'handwoven-jamdani-muslin-overlay',
      description: 'Crafted from airy Bengal muslin handwoven with delicate Jamdani floral motifs. Supremely lightweight, semi-sheer, and exceptionally comfortable for warm Indian weather.',
      basePrice: 1699.0,
      isPublished: true,
      isFeatured: false,
      sellerId: seller2Profile.id,
      imageUrl: 'https://images.unsplash.com/photo-1596755094514-f87e34085b2c?auto=format&fit=crop&w=1000&q=80',
      variants: [
        { sku: 'KHA-JAM-BTI', name: 'Subtle Floral Buti Motif', stock: 5, size: 'One Size' },
        { sku: 'KHA-JAM-JAL', name: 'All-Over Royal Jaal Weave', stock: 4, size: 'One Size', priceOverride: 1899.0 },
      ],
    },

    // --- Category 5: Sustainable Living & Decor ---
    {
      categorySlug: 'sustainable-decor',
      name: 'Handcrafted Teakwood Brass Serving Platter',
      slug: 'reclaimed-teakwood-brass-inlay-tray',
      description: 'Hand-carved by Saharanpur woodworkers from solid seasoned teakwood. Inlaid with polished brass motifs and sealed with natural food-safe cold-pressed walnut oil.',
      basePrice: 999.0,
      isPublished: true,
      isFeatured: true,
      sellerId: seller1Profile.id,
      imageUrl: 'https://images.unsplash.com/photo-1583847268964-b28dc8f51f92?auto=format&fit=crop&w=1000&q=80',
      variants: [
        { sku: 'DEC-TRY-STD', name: 'Standard Platter (12 x 8 in)', stock: 8, size: '12x8 in' },
        { sku: 'DEC-TRY-GRD', name: 'Grand Banquet Tray (16 x 11 in)', stock: 5, size: '16x11 in', priceOverride: 1299.0 },
      ],
    },
    {
      categorySlug: 'sustainable-decor',
      name: 'Hand-Hammered Pure Kansa Bronze Thali Set',
      slug: 'hand-hammered-kansa-dining-set',
      description: 'Forged by Kansara bell-metal artisans using the traditional 78% copper and 22% tin alloy commended in Ayurveda for its health and digestion benefits. Beautiful golden sheen.',
      basePrice: 2499.0,
      isPublished: true,
      isFeatured: true,
      sellerId: seller2Profile.id,
      imageUrl: 'https://images.unsplash.com/photo-1556911220-e15b29be8c8f?auto=format&fit=crop&w=1000&q=80',
      variants: [
        { sku: 'DEC-KAN-4PC', name: '4-Piece Thali Set (Thali, 2 Bowls, Spoon)', stock: 7, size: '4-Piece Set', priceOverride: 2499.0 },
        { sku: 'DEC-KAN-6PC', name: '6-Piece Royal Feast Set (Thali, 3 Bowls, Glass, Spoon)', stock: 4, size: '6-Piece Set', priceOverride: 3499.0 },
      ],
    },
    {
      categorySlug: 'sustainable-decor',
      name: 'Handpainted Jaipur Blue Pottery Flower Vase',
      slug: 'jaipur-blue-pottery-botanical-vessel',
      description: 'Traditional GI-tagged Jaipur Blue Pottery made without clay using ground quartz, glass powder, and natural gum. Hand-painted with royal cobalt floral motifs and glazed in wood kilns.',
      basePrice: 799.0,
      isPublished: true,
      isFeatured: false,
      sellerId: seller2Profile.id,
      imageUrl: 'https://images.unsplash.com/photo-1578749556568-bc2c40e68b61?auto=format&fit=crop&w=1000&q=80',
      variants: [
        { sku: 'DEC-POT-10', name: '8-inch Fluted Vase / Persian Blue', stock: 6, size: '8 inch' },
        { sku: 'DEC-POT-14', name: '12-inch Heritage Vase / Cobalt Blue', stock: 4, size: '12 inch', priceOverride: 999.0 },
      ],
    },

    // --- Category 6: Botanical Wellness & Pure Aromas ---
    {
      categorySlug: 'botanical-wellness',
      name: 'Pure Kannauj Mitti Attar (Mitti Ki Khushboo)',
      slug: 'kannauj-mitti-attar-monsoon-earth',
      description: 'The legendary fragrance of fresh rain on parched baked soil (petrichor). Hydro-distilled in Kannauj, UP using traditional copper Deg-Bhapka stills into pure sandalwood oil base. 100% alcohol-free.',
      basePrice: 599.0,
      isPublished: true,
      isFeatured: true,
      sellerId: seller1Profile.id,
      imageUrl: 'https://images.unsplash.com/photo-1608571423902-eed4a5ad8108?auto=format&fit=crop&w=1000&q=80',
      variants: [
        { sku: 'WEL-MIT-10ML', name: '10ml Pure Glass Roll-on Flacon', stock: 15, size: '10ml', priceOverride: 599.0 },
        { sku: 'WEL-MIT-25ML', name: '25ml Heritage Gift Edition', stock: 8, size: '25ml', priceOverride: 999.0 },
      ],
    },
    {
      categorySlug: 'botanical-wellness',
      name: 'Pure Kashmiri Kumkumadi & Kesar Facial Glow Oil',
      slug: 'wild-kashmir-saffron-rose-elixir',
      description: 'Infused with authentic hand-harvested Grade-A Mongra Kashmiri saffron (kesar) and cold-pressed wild rosehip oil. Deeply nourishes skin, enhances natural radiance, and evens out tone.',
      basePrice: 699.0,
      isPublished: true,
      isFeatured: false,
      sellerId: seller1Profile.id,
      imageUrl: 'https://images.unsplash.com/photo-1617897903246-719242758050?auto=format&fit=crop&w=1000&q=80',
      variants: [
        { sku: 'WEL-SAF-30ML', name: '30ml Dropper Flacon', stock: 14, size: '30ml' },
        { sku: 'WEL-SAF-50ML', name: '50ml Apothecary Value Pack', stock: 9, size: '50ml', priceOverride: 999.0 },
      ],
    },
    {
      categorySlug: 'botanical-wellness',
      name: 'Temple Flower Organic Charcoal-Free Dhoop Cones',
      slug: 'temple-flower-recycled-sacred-dhoop',
      description: 'Handcrafted from sacred recycled temple marigold and rose flowers, blended with pure cow ghee and natural loban (sambrani). 100% charcoal-free, non-toxic, and soothing spiritual aroma.',
      basePrice: 249.0,
      isPublished: true,
      isFeatured: false,
      sellerId: seller2Profile.id,
      imageUrl: 'https://images.unsplash.com/photo-1602928321679-560bb453f190?auto=format&fit=crop&w=1000&q=80',
      variants: [
        { sku: 'WEL-DHP-30', name: 'Box of 30 Cones with Terracotta Holder', stock: 20, size: '30 Cones' },
        { sku: 'WEL-DHP-60', name: 'Value Pack of 60 Cones with Brass Stand', stock: 12, size: '60 Cones', priceOverride: 399.0 },
      ],
    },
  ];

  let seededCount = 0;
  for (const item of productsData) {
    const categoryId = categoryMap[item.categorySlug];
    if (!categoryId) {
      console.warn(`Category slug not found for product: ${item.slug}`);
      continue;
    }

    const product = await prisma.product.create({
      data: {
        name: item.name,
        slug: item.slug,
        description: item.description,
        basePrice: item.basePrice,
        isPublished: item.isPublished,
        isFeatured: item.isFeatured,
        categoryId,
        sellerId: item.sellerId,
        images: {
          create: [
            {
              url: item.imageUrl,
              altText: `${item.name} artisanal craft photo`,
              sortOrder: 0,
            },
          ],
        },
      },
    });

    // Seed variants for this product
    for (const v of item.variants) {
      await prisma.productVariant.create({
        data: {
          productId: product.id,
          sku: v.sku,
          name: v.name,
          stockQuantity: v.stock,
          priceOverride: (v as any).priceOverride || null,
          attributes: {
            ...((v as any).size ? { size: (v as any).size } : {}),
            ...((v as any).color ? { color: (v as any).color } : {}),
          },
          weightGrams: 350,
        },
      });
    }

    seededCount++;
  }

  console.log(`📦 ${seededCount} bespoke luxury & eco-friendly products seeded across 6 categories.`);
  console.log('✅ Handcrafted & Sustainable Database Seeding Completed Successfully!');
}

main()
  .catch((e) => {
    console.error('❌ Seeding failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
