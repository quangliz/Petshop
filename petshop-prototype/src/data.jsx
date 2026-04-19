// Mock data for PetShop AI

const CATEGORIES = [
  { id: 'food', name: 'Thức ăn', emoji: '🍖', count: 184 },
  { id: 'toys', name: 'Đồ chơi', emoji: '🎾', count: 92 },
  { id: 'litter', name: 'Cát vệ sinh', emoji: '🪴', count: 28 },
  { id: 'health', name: 'Sức khoẻ', emoji: '💊', count: 67 },
  { id: 'grooming', name: 'Chăm lông', emoji: '✂️', count: 45 },
  { id: 'accessory', name: 'Phụ kiện', emoji: '🎀', count: 136 },
];

const SPECIES = [
  { id: 'dog', name: 'Chó', emoji: '🐕' },
  { id: 'cat', name: 'Mèo', emoji: '🐈' },
  { id: 'bird', name: 'Chim', emoji: '🐦' },
  { id: 'fish', name: 'Cá', emoji: '🐠' },
  { id: 'rabbit', name: 'Thỏ', emoji: '🐇' },
  { id: 'hamster', name: 'Hamster', emoji: '🐹' },
];

const BRANDS = ['Royal Canin', 'Whiskas', 'Pedigree', 'Me-O', 'Reflex', 'Catsrang', 'SmartHeart', 'Ganador'];

const PRODUCTS = [
  { id: 'p1', slug: 'royal-canin-kitten-1-5kg', name: 'Royal Canin Kitten — Hạt cho mèo con 4-12 tháng', brand: 'Royal Canin', price: 295000, originalPrice: 350000, species: ['cat'], category: 'food', rating: 4.7, reviews: 128, badge: 'bestseller', weight: '1.5kg', label: 'Hạt Mèo' },
  { id: 'p2', slug: 'whiskas-tuna-pouch', name: 'Whiskas Pouch Cá Ngừ sốt gravy 85g (lốc 12)', brand: 'Whiskas', price: 189000, originalPrice: 210000, species: ['cat'], category: 'food', rating: 4.5, reviews: 89, weight: '12×85g', label: 'Pate Mèo' },
  { id: 'p3', slug: 'pedigree-puppy-3kg', name: 'Pedigree Puppy — Hạt cho chó con vị thịt bò', brand: 'Pedigree', price: 420000, species: ['dog'], category: 'food', rating: 4.6, reviews: 203, weight: '3kg', label: 'Hạt Chó' },
  { id: 'p4', slug: 'catsrang-sensitive-2kg', name: 'Catsrang Sensitive — Hạt chống rụng lông', brand: 'Catsrang', price: 255000, originalPrice: 290000, species: ['cat'], category: 'food', rating: 4.8, reviews: 312, badge: 'new', weight: '2kg', label: 'Hạt Mèo' },
  { id: 'p5', slug: 'reflex-plus-kitten', name: 'Reflex Plus Kitten — Hạt mèo con vị cá hồi', brand: 'Reflex', price: 180000, species: ['cat'], category: 'food', rating: 4.4, reviews: 67, weight: '1.5kg', label: 'Hạt Mèo' },
  { id: 'p6', slug: 'me-o-tuna-1-2kg', name: 'Me-O Tuna — Hạt cho mèo trưởng thành', brand: 'Me-O', price: 95000, species: ['cat'], category: 'food', rating: 4.3, reviews: 421, weight: '1.2kg', label: 'Hạt Mèo' },
  { id: 'p7', slug: 'cat-litter-tofu-6l', name: 'Cát đậu hũ khử mùi — Vị trà xanh 6L', brand: 'SmartHeart', price: 145000, species: ['cat'], category: 'litter', rating: 4.7, reviews: 156, weight: '6L', label: 'Cát Vệ Sinh' },
  { id: 'p8', slug: 'bone-chew-toy', name: 'Xương gặm cao su — Đồ chơi cho chó size M', brand: 'Ganador', price: 89000, originalPrice: 120000, species: ['dog'], category: 'toys', rating: 4.5, reviews: 88, label: 'Đồ Chơi' },
];

const PETS_DATA = [
  { id: 'pet1', name: 'Miu', emoji: '🐈', species: 'Mèo', breed: 'Anh lông ngắn', age: '3 tháng', weight: '2.1kg', gender: 'Cái', allergies: ['gà'], color: 'oklch(0.85 0.08 50)' },
  { id: 'pet2', name: 'Lucky', emoji: '🐕', species: 'Chó', breed: 'Golden Retriever', age: '2 năm', weight: '25kg', gender: 'Đực', allergies: [], color: 'oklch(0.85 0.08 85)' },
  { id: 'pet3', name: 'Bơ', emoji: '🐈', species: 'Mèo', breed: 'Mèo mướp', age: '1 năm', weight: '3.8kg', gender: 'Đực', allergies: ['hải sản'], color: 'oklch(0.88 0.05 150)' },
];

const CHAT_SESSIONS = [
  { id: 's1', title: 'Chọn hạt cho Miu mèo con', petId: 'pet1', lastMessage: 'Dạ em gợi ý Royal Canin Kitten nha anh!', timestamp: '2 giờ trước', active: true },
  { id: 's2', title: 'Tẩy giun định kỳ cho Lucky', petId: 'pet2', lastMessage: 'Lucky 2 tuổi nên tẩy 3 tháng/lần...', timestamp: 'Hôm qua' },
  { id: 's3', title: 'Cát đậu hũ vs cát đất sét', petId: 'pet3', lastMessage: 'Cát đậu hũ ít bụi hơn, phù hợp nếu...', timestamp: '2 ngày trước' },
  { id: 's4', title: 'Miu hay gãi tai — bị gì?', petId: 'pet1', lastMessage: 'Có thể là ve tai hoặc viêm...', timestamp: '5 ngày trước' },
  { id: 's5', title: 'Bơ không chịu ăn hạt mới', petId: 'pet3', lastMessage: 'Anh thử trộn 20% hạt mới...', timestamp: '1 tuần trước' },
];

const CHAT_MESSAGES = [
  {
    id: 'm1', role: 'user',
    content: 'Bé Miu nhà mình 3 tháng, mới nuôi tuần trước. Nên cho ăn hạt gì anh ơi?'
  },
  {
    id: 'm2', role: 'assistant',
    content: 'Chào anh! Với bé **Miu 3 tháng tuổi, giống Anh lông ngắn (2.1kg)**, em gợi ý dòng hạt dành riêng cho mèo con (kitten) — hàm lượng protein cao 34–38%, hạt nhỏ dễ nhai, bổ sung DHA cho não bộ và taurine cho mắt.\n\nEm thấy hồ sơ Miu có ghi dị ứng gà → em đã loại các dòng có gà khỏi gợi ý.',
    products: ['p1', 'p4', 'p5'],
    sources: ['royalcanin.com', 'petmd.com', 'vca-hospital.com'],
    toolCalls: [
      { name: 'get_pet_profile', status: 'done', args: 'pet_id=pet1' },
      { name: 'search_products', status: 'done', args: 'species=cat, age=kitten, exclude_ingredients=chicken' },
    ],
  },
  {
    id: 'm3', role: 'user',
    content: 'Bé ấy hay bị tiêu chảy nhẹ thì nên chọn loại nào trong 3 cái trên?'
  },
  {
    id: 'm4', role: 'assistant', streaming: true,
    content: 'Nếu Miu tiêu hoá nhạy cảm, em khuyến nghị **Catsrang Sensitive** — công thức dịu ruột với prebiotics, không chứa chất tạo màu. Anh cho ăn thử 1 tuần, chia 4 bữa nhỏ/ngày (~40g/ngày cho bé 2.1kg).\n\nEm cũng nhắc thêm: nếu tiêu chảy kéo dài >2 ngày hoặc có máu → nên đi vet ngay, có thể là ký sinh trùng chứ không phải do thức ăn.',
    products: ['p4'],
    sources: ['catsrang.com', 'akc.org'],
  },
];

const QUICK_PROMPTS = [
  { icon: '🍽️', text: 'Chọn hạt cho mèo con' },
  { icon: '💊', text: 'Lịch tẩy giun định kỳ' },
  { icon: '🪴', text: 'Cát vệ sinh nào tốt?' },
  { icon: '✂️', text: 'Chải lông rụng mùa' },
  { icon: '🏥', text: 'Khi nào cần đi vet?' },
  { icon: '🦴', text: 'Đồ chơi an toàn cho chó' },
];

Object.assign(window, {
  CATEGORIES, SPECIES, BRANDS, PRODUCTS,
  PETS_DATA, CHAT_SESSIONS, CHAT_MESSAGES, QUICK_PROMPTS,
  formatVND: (n) => n.toLocaleString('vi-VN') + '₫',
});
