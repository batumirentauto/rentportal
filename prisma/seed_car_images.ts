import { prisma } from "../src/lib/prisma";

const carImages: Record<string, string> = {
  // 1. RAV4 4x4
  "TB-742-GE": "https://images.unsplash.com/photo-1581540222194-0def2dda95b8?auto=format&fit=crop&w=1200&q=85",
  // 2. Tucson
  "BA-918-GE": "https://images.unsplash.com/photo-1549399542-7e3f8b79c341?auto=format&fit=crop&w=1200&q=85",
  // 3. Camry SE
  "TB-305-GE": "https://images.unsplash.com/photo-1621007947382-bb3c3994e3fb?auto=format&fit=crop&w=1200&q=85",
  // 4. Sportage
  "KU-551-GE": "https://images.unsplash.com/photo-1552519507-da3b142c6e3d?auto=format&fit=crop&w=1200&q=85",
  // 5. Mustang Cabrio
  "BA-007-GE": "https://images.unsplash.com/photo-1584345604476-8ec5e12e42dd?auto=format&fit=crop&w=1200&q=85",
  // 6. Forester AWD
  "TB-448-GE": "https://images.unsplash.com/photo-1533473359331-0135ef1b58bf?auto=format&fit=crop&w=1200&q=85",
  // 7. Elantra
  "KU-230-GE": "https://images.unsplash.com/photo-1541899481282-d53bffe3c35d?auto=format&fit=crop&w=1200&q=85",
  // 8. Mercedes E 300
  "TB-999-GE": "https://images.unsplash.com/photo-1617788138017-80ad40651399?auto=format&fit=crop&w=1200&q=85",
  // 9. Outlander 7-seat
  "BA-332-GE": "https://images.unsplash.com/photo-1563720223185-11003d516935?auto=format&fit=crop&w=1200&q=85",
  // 10. Prado 150
  "TB-800-GE": "https://images.unsplash.com/photo-1594502184342-2e12f877aa73?auto=format&fit=crop&w=1200&q=85",
  // 11. Prius Hybrid
  "TB-112-GE": "https://images.unsplash.com/photo-1590362891991-f776e747a588?auto=format&fit=crop&w=1200&q=85",
  // 12. Camaro Cabrio
  "BA-555-GE": "https://images.unsplash.com/photo-1552519507-da3b142c6e3d?auto=format&fit=crop&w=1200&q=85",
  // 13. Lexus RX 350
  "TB-777-GE": "https://images.unsplash.com/photo-1542282088-72c9c27ed0cd?auto=format&fit=crop&w=1200&q=85",
  // 14. Kia K5
  "KU-888-GE": "https://images.unsplash.com/photo-1605559424843-9e4c228bf1c2?auto=format&fit=crop&w=1200&q=85",
  // 15. Jeep Wrangler
  "TB-404-GE": "https://images.unsplash.com/photo-1533473359331-0135ef1b58bf?auto=format&fit=crop&w=1200&q=85",
  // 16. Toyota Sienna
  "TB-630-GE": "https://images.unsplash.com/photo-1568605117036-5fe5e7bab0b7?auto=format&fit=crop&w=1200&q=85",
  // 17. Outback AWD
  "KU-109-GE": "https://images.unsplash.com/photo-1503376780353-7e6692767b70?auto=format&fit=crop&w=1200&q=85",
  // 18. Nissan Rogue
  "BA-419-GE": "https://images.unsplash.com/photo-1580273916550-e323be2ae537?auto=format&fit=crop&w=1200&q=85",
  // 19. BMW X5
  "TB-001-GE": "https://images.unsplash.com/photo-1555215695-3004980ad54e?auto=format&fit=crop&w=1200&q=85",
  // 20. Corolla
  "BA-202-GE": "https://images.unsplash.com/photo-1590362891991-f776e747a588?auto=format&fit=crop&w=1200&q=85",
};

async function main() {
  console.log("Seeding photo images for all cars...");

  for (const [plate, imgUrl] of Object.entries(carImages)) {
    await prisma.car.updateMany({
      where: { plateNumber: plate },
      data: {
        imageUrl: imgUrl,
      },
    });
  }

  console.log("✅ Seeded photo images successfully!");
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
