const { Client } = require('pg');

async function run() {
  const client = new Client({
    host: 'aws-0-ap-northeast-1.pooler.supabase.com',
    port: 6543,
    user: 'postgres.ldvpxucdnygvsgdwptar',
    password: 'bAkery_website_098',
    database: 'postgres',
    ssl: { rejectUnauthorized: false }
  });

  await client.connect();

  const opera = JSON.stringify([
    { size: '500g', price: 450 },
    { size: '1 kg', price: 850, is_default: true },
    { size: '1.5 kg', price: 1250 },
    { size: '2 kg', price: 1600 },
    { size: '3 kg', price: 2350 }
  ]);

  await client.query(
    'UPDATE public.menu_items SET pricing_type = $1, price = $2, size_variants = $3::jsonb WHERE name ILIKE $4;',
    ['weight', 850, opera, '%Opera%']
  );

  const cheese = JSON.stringify([
    { size: 'Slice (180g)', price: 280, is_default: true },
    { size: 'Half Cake (600g)', price: 750 },
    { size: 'Whole Cake (1.2 kg)', price: 1400 },
    { size: 'Grand Celebration (2 kg)', price: 2200 }
  ]);

  await client.query(
    'UPDATE public.menu_items SET pricing_type = $1, size_variants = $2::jsonb WHERE name ILIKE $3;',
    ['weight', cheese, '%Cheesecake%']
  );

  console.log('Seeded size variants successfully!');
  await client.end();
}

run().catch(console.error);

