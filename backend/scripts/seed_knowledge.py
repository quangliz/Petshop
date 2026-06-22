"""Seed the knowledge base with hand-written Vietnamese pet-care articles.

Idempotent by title: deletes existing doc with the same title (and its chunks)
before inserting.

Run: uv run python scripts/seed_knowledge.py
"""
import asyncio
import os
import sys

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from sqlalchemy import select

from app.database import AsyncSessionLocal, engine
from app.models.knowledge import KnowledgeDoc, DocCategoryEnum


SOURCE_URLS_BY_CATEGORY = {
    DocCategoryEnum.nutrition: (
        "https://www.merckvetmanual.com/management-and-nutrition/"
        "nutrition-small-animals/feeding-practices-in-small-animals"
    ),
    DocCategoryEnum.health: (
        "https://www.merckvetmanual.com/management-and-nutrition/"
        "preventative-health-care-and-husbandry-in-small-animals/"
        "preventative-health-care-for-small-animals"
    ),
    DocCategoryEnum.training: (
        "https://www.merckvetmanual.com/dog-owners/behavior-of-dogs/"
        "behavior-modification-in-dogs"
    ),
    DocCategoryEnum.grooming: (
        "https://www.merckvetmanual.com/dog-owners/routine-care-and-breeding-of-dogs/"
        "hygiene-and-routine-care-for-dogs"
    ),
    DocCategoryEnum.breed: (
        "https://www.merckvetmanual.com/multimedia/table/"
        "congenital-and-inherited-disorders-of-the-digestive-system-in-dogs"
    ),
    DocCategoryEnum.policy: "/dieu-khoan-mua-ban",
    DocCategoryEnum.faq: "/faq",
}


ARTICLES = [
    # ---------------- NUTRITION ----------------
    {
        "title": "Dinh dưỡng cho mèo con dưới 6 tháng",
        "category": DocCategoryEnum.nutrition,
        "content": (
            "Mèo con từ 1 đến 6 tháng tuổi đang trong giai đoạn phát triển nhanh, cần khẩu phần "
            "giàu protein (tối thiểu 30%), chất béo (15–20%) và taurine. Trong 4 tuần đầu mèo con "
            "bú sữa mẹ; nếu mất mẹ phải dùng sữa thay thế dành riêng cho mèo, tuyệt đối không "
            "dùng sữa bò vì gây tiêu chảy.\n\n"
            "Từ 4–8 tuần bắt đầu cai sữa: trộn pate hoặc hạt mềm với nước ấm thành cháo loãng, "
            "cho ăn 4–5 bữa nhỏ mỗi ngày. Từ 2 tháng có thể chuyển dần sang hạt khô dành cho "
            "mèo con (kitten). Khẩu phần khoảng 60–80g/ngày tuỳ cân nặng, chia 3–4 bữa.\n\n"
            "Luôn để nước sạch sẵn. Tránh các thực phẩm độc với mèo: hành, tỏi, socola, nho, "
            "cá sống, xương cá. Bổ sung canxi và DHA giúp mèo phát triển xương và thị lực."
        ),
    },
    {
        "title": "Dinh dưỡng cho chó trưởng thành theo cân nặng",
        "category": DocCategoryEnum.nutrition,
        "content": (
            "Nhu cầu năng lượng của chó trưởng thành (RER) ước tính bằng công thức "
            "70 × (cân nặng kg)^0.75 kcal/ngày, nhân hệ số hoạt động 1.6 với chó ít vận động "
            "và 2.0–2.5 với chó hoạt động nhiều.\n\n"
            "Ví dụ: chó Husky 20kg cần ~1450–1800 kcal/ngày, tương đương 350–420g hạt khô loại "
            "cao năng lượng (4 kcal/g). Chia 2 bữa sáng tối, không nên cho ăn 1 bữa lớn dễ "
            "gây xoắn dạ dày ở giống lớn.\n\n"
            "Protein nên chiếm 22–28% tổng khẩu phần, ưu tiên thịt gà, cá hồi, thịt bò. "
            "Tránh xương ống nấu chín (dễ vỡ vụn), nho, socola, xylitol và hành tỏi. "
            "Chó béo phì cần giảm 20–25% khẩu phần và tăng vận động."
        ),
    },
    {
        "title": "Lựa chọn thức ăn cho chó con dưới 12 tháng",
        "category": DocCategoryEnum.nutrition,
        "content": (
            "Chó con cần thức ăn 'puppy' với protein ≥27%, chất béo ≥15%, đủ canxi-photpho "
            "tỉ lệ 1.2:1. Giống lớn (Golden, Husky, Becgie) dùng công thức 'large breed puppy' "
            "với canxi thấp hơn để tránh phát triển xương quá nhanh.\n\n"
            "Số bữa: 2–4 tháng cho ăn 4 bữa/ngày, 4–6 tháng giảm còn 3 bữa, sau 6 tháng còn "
            "2 bữa. Nước sạch luôn có sẵn.\n\n"
            "Khi đổi thức ăn phải chuyển từ từ trong 7 ngày: ngày 1–2 trộn 25% thức ăn mới, "
            "tăng dần để tránh tiêu chảy. Bổ sung thêm dầu cá omega-3 giúp lông và não phát triển."
        ),
    },
    {
        "title": "Chế độ ăn BARF và raw food cho thú cưng",
        "category": DocCategoryEnum.nutrition,
        "content": (
            "BARF (Biologically Appropriate Raw Food) là chế độ ăn sống gồm thịt nạc, xương "
            "sống xay, nội tạng và rau củ xay. Tỉ lệ phổ biến: 70% thịt cơ bắp, 10% xương sống "
            "ăn được, 10% nội tạng (5% gan), 10% rau/hoa quả.\n\n"
            "Lợi ích: lông mượt, răng sạch, phân ít. Rủi ro: nhiễm khuẩn Salmonella, "
            "thiếu vi chất nếu pha không cân đối, gãy răng do xương cứng. Không khuyến khích "
            "với thú cưng già, đang dùng kháng sinh, hoặc người nuôi có trẻ nhỏ/người già "
            "trong nhà do nguy cơ lây chéo.\n\n"
            "Nếu áp dụng nên tham khảo bác sĩ thú y dinh dưỡng và đông lạnh thịt -20°C "
            "ít nhất 3 ngày để giảm ký sinh trùng."
        ),
    },
    {
        "title": "Dinh dưỡng cho mèo bị sỏi tiết niệu (FLUTD)",
        "category": DocCategoryEnum.nutrition,
        "content": (
            "Mèo bị sỏi struvite hoặc oxalate cần khẩu phần điều trị (urinary diet) với hàm "
            "lượng magie thấp, pH nước tiểu được kiểm soát 6.0–6.4 với struvite hoặc 6.6–6.8 "
            "với oxalate.\n\n"
            "Ưu tiên thức ăn pate hoặc ướt vì độ ẩm cao (>75%) làm pha loãng nước tiểu, "
            "giảm tái tạo tinh thể. Khuyến khích uống nước bằng cách dùng đài phun, đặt nhiều "
            "bát nước quanh nhà.\n\n"
            "Tránh thức ăn người, cá khô mặn, hạt giá rẻ chứa nhiều magie. Theo dõi biểu hiện: "
            "đi tiểu nhiều lần, kêu khi đi tiểu, có máu — phải đưa đi khám ngay vì tắc niệu đạo "
            "có thể gây tử vong trong 48h."
        ),
    },

    # ---------------- HEALTH ----------------
    {
        "title": "Lịch tiêm phòng cơ bản cho chó",
        "category": DocCategoryEnum.health,
        "content": (
            "Chó con cần tiêm các mũi quan trọng từ 6 tuần tuổi:\n"
            "- 6–8 tuần: vaccine 5 bệnh (Care, Parvo, viêm gan, ho cũi, phó cúm).\n"
            "- 10–12 tuần: vaccine 7 bệnh (thêm Lepto, Corona).\n"
            "- 14–16 tuần: nhắc lại 7 bệnh + dại (Rabies).\n"
            "- Hàng năm: nhắc lại 7 bệnh + dại.\n\n"
            "Trước tiêm chó phải khoẻ mạnh, không sốt, không tiêu chảy 2 ngày liền. Sau tiêm "
            "nên theo dõi 24h tại nhà, hạn chế tắm 5–7 ngày, không ra ngoài tiếp xúc chó lạ "
            "đến khi đủ 2 tuần sau mũi cuối.\n\n"
            "Tẩy giun song song: 2 tuần tuổi tẩy lần đầu, lặp lại mỗi 2 tuần đến 12 tuần, "
            "sau đó 3 tháng/lần."
        ),
    },
    {
        "title": "Dấu hiệu mèo nôn liên tục cần đi khám",
        "category": DocCategoryEnum.health,
        "content": (
            "Mèo nôn 1 lần/tuần (do búi lông) là bình thường. Cần đưa khám ngay khi:\n"
            "- Nôn >3 lần trong 24h.\n"
            "- Nôn có máu, dịch vàng đậm, hoặc kèm tiêu chảy.\n"
            "- Bỏ ăn >24h, lừ đừ, mất nước (véo da chậm hồi).\n"
            "- Bụng cứng, kêu đau khi sờ.\n\n"
            "Nguyên nhân thường gặp: ăn dị vật (dây, kim, tóc), ngộ độc cây cảnh (ly, lan ý), "
            "viêm dạ dày, tắc ruột do búi lông, suy thận mạn ở mèo già.\n\n"
            "Sơ cứu tại nhà: nhịn ăn 12h nhưng vẫn cho uống nước từng ngụm nhỏ, sau đó cho "
            "ăn cháo gà luộc nhạt 2–3 ngày. Không tự ý cho thuốc người (paracetamol cực độc "
            "với mèo). Nếu nghi ngộ độc, mang nguyên vỏ thuốc/cây đến phòng khám."
        ),
    },
    {
        "title": "Phòng và xử lý ve, bọ chét trên chó mèo",
        "category": DocCategoryEnum.health,
        "content": (
            "Ve và bọ chét gây ngứa, thiếu máu, lây bệnh giảm tiểu cầu, Lyme, Babesia. "
            "Mùa hè-thu là cao điểm.\n\n"
            "Phòng ngừa: dùng thuốc nhỏ gáy (Frontline, Bravecto, NexGard) định kỳ 1–3 tháng "
            "tuỳ loại. Vòng cổ Seresto bảo vệ 6–8 tháng. Không dùng thuốc của chó cho mèo "
            "vì permethrin gây tử vong cho mèo.\n\n"
            "Khi đã bị: tắm bằng dầu trị ve (Fipronil), hút bụi và giặt giường thú cưng nước "
            "60°C, xịt môi trường. Dùng nhíp gắp ve sát da theo hướng vuông góc, không vặn — "
            "đầu ve gãy lại trong da gây áp xe. Sau gắp sát trùng bằng cồn iod."
        ),
    },
    {
        "title": "Suy thận mạn ở mèo già",
        "category": DocCategoryEnum.health,
        "content": (
            "Mèo trên 7 tuổi có nguy cơ suy thận mạn (CKD) cao. Triệu chứng: uống nhiều, "
            "tiểu nhiều, sụt cân, lông xơ, nôn, hôi miệng (mùi amoniac).\n\n"
            "Chẩn đoán: xét nghiệm máu (creatinine, BUN, SDMA), nước tiểu (USG), siêu âm thận. "
            "Phân giai đoạn IRIS 1–4 để định hướng điều trị.\n\n"
            "Điều trị bao gồm: thức ăn thận chuyên dụng (low protein chất lượng cao, low "
            "phosphorus), truyền dịch dưới da định kỳ, thuốc giảm phospho (chất kết hợp), "
            "thuốc hạ huyết áp nếu cần. Khám lại 3–6 tháng/lần. Mèo CKD vẫn có thể sống "
            "thêm nhiều năm nếu phát hiện sớm và quản lý tốt."
        ),
    },
    {
        "title": "Dấu hiệu chó bị sốc nhiệt mùa hè",
        "category": DocCategoryEnum.health,
        "content": (
            "Sốc nhiệt (heatstroke) xảy ra khi thân nhiệt chó vượt 40°C, đặc biệt nguy hiểm "
            "với giống mặt ngắn (Pug, Bulldog), béo phì, lông dày.\n\n"
            "Dấu hiệu: thở hổn hển nhanh, lưỡi đỏ tím, chảy dãi đặc, lảo đảo, nôn, co giật, "
            "ngất xỉu. Trên 41°C có thể tổn thương não và đông máu rải rác (DIC).\n\n"
            "Sơ cứu: đưa vào nơi mát, dùng khăn ướt nước thường (KHÔNG nước đá) đắp bụng, "
            "nách, bẹn; quạt mát. Cho uống nước nguội từng ngụm. Đo nhiệt độ trực tràng — "
            "khi xuống 39.5°C dừng làm mát và đưa đi khám ngay vì biến chứng nội tạng có thể "
            "xuất hiện 24–48h sau."
        ),
    },

    # ---------------- TRAINING ----------------
    {
        "title": "Huấn luyện chó con đi vệ sinh đúng chỗ",
        "category": DocCategoryEnum.training,
        "content": (
            "Chó con 8–16 tuần kiểm soát bàng quang yếu — dùng nguyên tắc 'tuổi tháng + 1' "
            "để tính số giờ nhịn tối đa (chó 2 tháng nhịn ~3h).\n\n"
            "Quy trình: dắt ra khu vệ sinh ngay khi (1) thức dậy, (2) ăn xong 10–20 phút, "
            "(3) chơi xong, (4) trước khi ngủ. Khi chó đi đúng chỗ, khen 'giỏi' và thưởng "
            "ngay trong 3 giây bằng treat nhỏ.\n\n"
            "Tránh phạt khi đi sai — chó không hiểu, chỉ tăng stress. Lau sạch chỗ sai bằng "
            "enzyme cleaner (không dùng amoniac vì giống nước tiểu càng kích thích đi lại). "
            "Crate training (lồng kennel kích thước vừa đủ nằm) giúp chó học nhịn tốt hơn."
        ),
    },
    {
        "title": "Dạy chó các lệnh cơ bản: ngồi, nằm, lại đây",
        "category": DocCategoryEnum.training,
        "content": (
            "Phương pháp positive reinforcement (R+) hiệu quả nhất với chó. Dùng treat nhỏ, "
            "huấn luyện 3–5 phút/lần, 2–3 lần/ngày để chó không chán.\n\n"
            "Ngồi (sit): cầm treat trên mũi chó, di chuyển từ từ ra phía sau đầu, mông chó "
            "tự hạ xuống. Nói 'sit' khi mông chạm đất, khen + thưởng. Lặp lại 10 lần/buổi.\n\n"
            "Nằm (down): từ tư thế ngồi, đưa treat xuống đất phía trước. Khi chó nằm rạp, "
            "nói 'down', thưởng. Lại đây (come): xích dài 3–5m, nói 'come' giọng vui, lùi "
            "về sau và thưởng to khi chó đến. Không bao giờ gọi 'come' rồi mắng — sẽ phá lệnh."
        ),
    },
    {
        "title": "Xử lý chó cắn người và sủa quá nhiều",
        "category": DocCategoryEnum.training,
        "content": (
            "Chó con cắn nhẹ khi chơi (mouthing) là bình thường — dùng 'yelp method': khi bị "
            "cắn kêu 'ái' to, ngừng chơi 30 giây để chó hiểu cắn = mất chơi. Cung cấp đồ chơi "
            "nhai (Kong, dây thừng) thay thế.\n\n"
            "Sủa quá nhiều thường do (1) buồn chán — tăng vận động 30–60 phút/ngày, (2) lo "
            "sợ — desensitization với kích thích, (3) đòi sự chú ý — phớt lờ khi sủa, chỉ "
            "tương tác khi im lặng.\n\n"
            "Chó cắn người lớn nghiêm trọng: đeo rọ mõm khi ra ngoài, tham vấn behaviorist. "
            "Không dùng vòng cổ điện hoặc đánh — gây tăng hung dữ. Triệt sản giảm 60–70% "
            "hành vi hung dữ ở chó đực."
        ),
    },
    {
        "title": "Socialization mèo con với người và mèo khác",
        "category": DocCategoryEnum.training,
        "content": (
            "Giai đoạn vàng socialization của mèo là 2–7 tuần tuổi — sau đó vẫn học được "
            "nhưng khó hơn. Mèo con nên được ôm bế nhẹ nhàng 5–10 phút/ngày bởi nhiều người "
            "khác nhau, làm quen âm thanh máy hút bụi, tiếng trẻ con.\n\n"
            "Khi đưa mèo mới về nhà có mèo cũ: cách ly 7 ngày, cho 2 mèo ngửi mùi nhau qua "
            "khăn. Mở cửa hé sau 1 tuần để nhìn nhau qua khe. Cho ăn đồng thời ở 2 phía "
            "cửa để tạo liên kết tích cực. Không bao giờ ép gặp mặt — mèo cần kiểm soát "
            "khoảng cách. Quá trình hoà nhập mất 2–6 tuần.\n\n"
            "Cung cấp tài nguyên (bát ăn, khay cát, chỗ ngủ) theo công thức n+1 với n là "
            "số mèo, đặt ở các vị trí khác nhau."
        ),
    },

    # ---------------- GROOMING ----------------
    {
        "title": "Tắm chó đúng cách và tần suất hợp lý",
        "category": DocCategoryEnum.grooming,
        "content": (
            "Tần suất tắm: chó lông ngắn 1 tháng/lần, lông dài 2–3 tuần/lần, chó bơi nhiều "
            "1 tuần/lần. Tắm quá thường xuyên làm khô da, gây viêm da.\n\n"
            "Quy trình: chải gỡ rối trước khi tắm, dùng nước ấm 37°C, dầu tắm pH 6.5–7.5 "
            "DÀNH RIÊNG cho chó (dầu người pH 5.5 quá axit). Massage 5 phút, xả thật sạch "
            "vì xà phòng còn lại gây ngứa. Tránh nước vào tai và mắt.\n\n"
            "Sấy bằng máy sấy chuyên dụng (không quá nóng) đến khô hoàn toàn — lông ẩm gây "
            "nấm da. Sau tắm chải lông, vệ sinh tai bằng dung dịch tai, cắt móng nếu dài. "
            "Không tắm khi chó vừa tiêm vaccine (đợi 7 ngày), đang ốm, hoặc dưới 2 tháng tuổi."
        ),
    },
    {
        "title": "Chải lông và chống búi lông cho mèo lông dài",
        "category": DocCategoryEnum.grooming,
        "content": (
            "Mèo Ba Tư, Maine Coon, Ragdoll cần chải lông HÀNG NGÀY để tránh búi rối. Dùng "
            "lược răng thưa gỡ rối trước, sau đó lược răng dày và bàn chải Slicker.\n\n"
            "Chỗ dễ rối: sau tai, nách, bụng, gốc đuôi. Búi đã hình thành: dùng kéo đầu tù "
            "cắt theo chiều dọc rồi gỡ — không kéo mạnh gây đau và rách da. Búi sát da phải "
            "đến tiệm dùng tông đơ.\n\n"
            "Búi lông trong dạ dày: cho ăn pate có chất xơ hairball, dùng malt (hairball "
            "remedy) 1 lần/tuần. Mèo nôn búi lông >2 lần/tuần là quá nhiều — cần tăng chải "
            "lông và đổi thức ăn hỗ trợ tiêu hoá lông."
        ),
    },
    {
        "title": "Cắt móng chó mèo an toàn tại nhà",
        "category": DocCategoryEnum.grooming,
        "content": (
            "Móng quá dài làm thú cưng đi lại đau, vẹo khớp, gãy móng khi mắc. Tần suất cắt: "
            "chó hoạt động ngoài trời 1 tháng/lần, chó nhà 2–3 tuần/lần, mèo 2 tuần/lần.\n\n"
            "Tìm 'quick' — phần hồng có mạch máu trong móng. Móng trắng dễ thấy quick, móng "
            "đen cắt từng chút một. Cắt cách quick 2mm. Nếu cắt vào quick gây chảy máu: "
            "ấn bột cầm máu (styptic powder) hoặc bột ngô vài phút.\n\n"
            "Mèo có móng rút được — bóp nhẹ ngón để móng lòi ra, chỉ cắt phần đầu nhọn. "
            "Đừng quên móng dewclaw (móng treo) ở chó. Tập cho thú cưng quen từ nhỏ bằng "
            "cách chạm chân + thưởng treat trước khi thực sự cắt."
        ),
    },

    # ---------------- BREED ----------------
    {
        "title": "Đặc điểm và cách chăm sóc chó Husky Siberia",
        "category": DocCategoryEnum.breed,
        "content": (
            "Husky là giống chó sled work vùng Siberia, cân nặng 16–27kg, tuổi thọ 12–14 năm. "
            "Bộ lông hai lớp dày — không hợp khí hậu nóng ẩm Việt Nam, cần ở phòng máy lạnh "
            "vào trưa hè và uống đủ nước.\n\n"
            "Năng lượng cực cao: cần vận động ÍT NHẤT 2 tiếng/ngày. Thiếu vận động sẽ phá "
            "đồ, hú nhiều, đào hố. Husky nổi tiếng 'ngu' chỉ là biểu hiện của cá tính độc "
            "lập — cần huấn luyện kiên nhẫn từ nhỏ, không hợp người mới nuôi chó.\n\n"
            "Vấn đề sức khoẻ: loạn sản khớp háng, đục thuỷ tinh thể, suy giáp. Lông rụng "
            "nhiều 2 lần/năm khi thay mùa — chải hàng ngày. Không nên cạo lông vì lớp lông "
            "kép giúp cách nhiệt cả nóng lẫn lạnh."
        ),
    },
    {
        "title": "Đặc điểm và cách chăm sóc mèo Anh lông ngắn (British Shorthair)",
        "category": DocCategoryEnum.breed,
        "content": (
            "Mèo Anh lông ngắn cân nặng 4–8kg, tuổi thọ 14–20 năm, tính cách điềm tĩnh, ít "
            "kêu, hợp căn hộ và gia đình có trẻ.\n\n"
            "Lông ngắn dày — chải 1–2 lần/tuần đủ. Dễ béo phì do lười vận động: kiểm soát "
            "khẩu phần 50–70g hạt/ngày, chia 2 bữa, dùng đồ chơi cần câu để khuyến khích "
            "vận động 15 phút/ngày.\n\n"
            "Vấn đề di truyền: bệnh cơ tim phì đại (HCM) — cần siêu âm tim mỗi năm sau 5 "
            "tuổi; bệnh thận đa nang (PKD). Khi mua nên chọn trại có giấy xét nghiệm gen "
            "âm tính. Mèo Anh ít kêu nhưng kêu là có chuyện — chú ý bất thường về ăn uống "
            "và đi vệ sinh."
        ),
    },
    {
        "title": "Đặc điểm và cách chăm sóc chó Golden Retriever",
        "category": DocCategoryEnum.breed,
        "content": (
            "Golden Retriever cân nặng 25–35kg, tuổi thọ 10–12 năm, tính cách hiền lành, "
            "thân thiện trẻ em — một trong những giống gia đình tốt nhất.\n\n"
            "Cần vận động 1–2 tiếng/ngày, rất thích bơi và mang đồ. Lông dày 2 lớp rụng "
            "quanh năm, đặc biệt nhiều vào xuân-thu — chải 3 lần/tuần, hút bụi nhà thường "
            "xuyên.\n\n"
            "Vấn đề sức khoẻ phổ biến: loạn sản khớp háng và khuỷu (kiểm tra OFA/PennHIP "
            "trước khi nuôi), ung thư (tỉ lệ ~60% sau 8 tuổi — kiểm tra khối u định kỳ), "
            "viêm tai do tai cụp ẩm (vệ sinh tai tuần 1 lần), béo phì. Chế độ ăn cân đối "
            "chất béo 12–14%, bổ sung glucosamine từ 5 tuổi."
        ),
    },
]


FOOTER_SERVICE_ARTICLES = [
    {
        "title": "FAQ ThePawsome: đặt hàng, tài khoản và trợ lý AI",
        "category": DocCategoryEnum.faq,
        "source_url": "/faq",
        "content": (
            "ThePawsome hỗ trợ khách hàng tìm sản phẩm cho chó mèo, quản lý giỏ hàng, đặt hàng "
            "và theo dõi đơn trong tài khoản. Người dùng chưa đăng nhập vẫn có thể xem sản phẩm; "
            "một số tính năng như lịch sử đơn hàng, hồ sơ thú cưng và cá nhân hóa AI cần đăng nhập.\n\n"
            "Câu hỏi thường gặp về đặt hàng: sau khi checkout thành công, hệ thống cấp mã đơn. "
            "Khách hàng có thể xem đơn trong mục Đơn hàng hoặc tra cứu bằng email và mã đơn nếu "
            "đặt hàng với tư cách khách. Nếu nhập sai địa chỉ hoặc số điện thoại, hãy liên hệ "
            "support@thepawsome.store càng sớm càng tốt trước khi đơn chuyển sang trạng thái đang giao.\n\n"
            "Câu hỏi thường gặp về Catbot: Catbot có thể tư vấn thông tin chăm sóc thú cưng, tìm "
            "sản phẩm trong cửa hàng và tham khảo hồ sơ thú cưng do người dùng tạo. Catbot không "
            "chẩn đoán bệnh, kê thuốc, xem dữ liệu của người khác hoặc tự thêm sản phẩm vào giỏ hàng. "
            "Khi có dấu hiệu nguy hiểm như khó thở, co giật, ngộ độc, bí tiểu hoặc nôn liên tục, "
            "khách hàng cần liên hệ bác sĩ thú y ngay.\n\n"
            "Câu hỏi thường gặp về hỗ trợ: kênh hỗ trợ chính là support@thepawsome.store và số "
            "+84888987400. Khi cần hỗ trợ đơn hàng, khách hàng nên cung cấp mã đơn, email đặt hàng, "
            "số điện thoại nhận hàng và hình ảnh liên quan nếu có lỗi sản phẩm hoặc giao nhận."
        ),
    },
    {
        "title": "Chính sách giao hàng ThePawsome",
        "category": DocCategoryEnum.policy,
        "source_url": "/chinh-sach-giao-hang",
        "content": (
            "ThePawsome áp dụng phí giao hàng minh họa 30.000đ cho mỗi đơn trong bản public demo. "
            "Khi vận hành thương mại chính thức, phạm vi giao hàng, thời gian dự kiến và biểu phí "
            "có thể thay đổi theo địa chỉ nhận hàng, đối tác vận chuyển, khối lượng kiện hàng và "
            "điều kiện khuyến mãi đang áp dụng.\n\n"
            "Quy trình xử lý đơn gồm các trạng thái chính: chờ xử lý, đã xác nhận, đang giao, hoàn "
            "thành hoặc hủy. Đơn có thể cần xác minh thêm nếu thông tin nhận hàng thiếu, số điện thoại "
            "không liên hệ được, sản phẩm hết tồn kho hoặc giao dịch thanh toán cần đối soát.\n\n"
            "Khách hàng có thể theo dõi trạng thái trong tài khoản hoặc tra cứu bằng email và mã đơn. "
            "Nếu kiện hàng hư hỏng, móp méo, thiếu sản phẩm hoặc giao sai mặt hàng, khách hàng nên "
            "chụp ảnh kiện hàng, tem vận chuyển, sản phẩm nhận được và liên hệ support@thepawsome.store "
            "trong thời gian sớm nhất để được kiểm tra."
        ),
    },
    {
        "title": "Chính sách thanh toán ThePawsome",
        "category": DocCategoryEnum.policy,
        "source_url": "/chinh-sach-thanh-toan",
        "content": (
            "ThePawsome hỗ trợ thanh toán khi nhận hàng (COD) và chuyển khoản VietQR qua SePay. "
            "Giá hiển thị bằng VND. Tổng tiền tại checkout gồm tạm tính sản phẩm, phí giao hàng "
            "và giảm giá nếu có mã khuyến mãi hợp lệ.\n\n"
            "Với COD, khách hàng thanh toán cho đơn vị giao hàng khi nhận hàng. Đơn chỉ được ghi "
            "nhận hoàn tất sau khi quy trình vận hành xác nhận giao hàng và thanh toán phù hợp.\n\n"
            "Với VietQR SePay, hệ thống hiển thị mã QR để khách hàng chuyển khoản và tự động cập nhật "
            "trạng thái sau khi nhận webhook đối soát. Nếu đã chuyển khoản nhưng trạng thái chưa cập "
            "nhật, khách hàng không nên thanh toán lại. Hãy liên hệ hỗ trợ kèm mã đơn, thời gian "
            "chuyển khoản, số tiền và ảnh biên lai để đối soát.\n\n"
            "ThePawsome không lưu thông tin thẻ, mật khẩu ngân hàng hoặc thông tin đăng nhập tài khoản "
            "ngân hàng của khách hàng. Các giao dịch bất thường, quá hạn giữ hàng hoặc lệch số tiền "
            "có thể được đánh dấu cần xử lý thủ công."
        ),
    },
    {
        "title": "Chính sách đổi trả ThePawsome",
        "category": DocCategoryEnum.policy,
        "source_url": "/chinh-sach-doi-tra",
        "content": (
            "ThePawsome tiếp nhận yêu cầu đổi trả khi sản phẩm giao sai, thiếu hàng, hư hỏng do vận "
            "chuyển hoặc có lỗi từ nhà bán/nhà sản xuất. Khách hàng nên gửi yêu cầu sớm sau khi nhận "
            "hàng và giữ lại bao bì, tem nhãn, phụ kiện, hóa đơn hoặc mã đơn để phục vụ xác minh.\n\n"
            "Một số nhóm hàng có thể không đủ điều kiện đổi trả vì lý do an toàn vệ sinh và sức khỏe "
            "thú cưng, gồm thức ăn đã mở bao bì, pate/snack đã dùng, sản phẩm vệ sinh đã qua sử dụng, "
            "thuốc hoặc sản phẩm chăm sóc sức khỏe nhạy cảm, trừ khi lỗi được xác định thuộc về nhà bán "
            "hoặc nhà sản xuất.\n\n"
            "Để yêu cầu đổi trả, khách hàng gửi email tới support@thepawsome.store với mã đơn, lý do, "
            "sản phẩm cần đổi trả, số lượng và hình ảnh/video mô tả vấn đề. Nhân viên sẽ xác minh trước "
            "khi hướng dẫn gửi hàng, đổi sản phẩm, hoàn tiền hoặc từ chối nếu không đáp ứng điều kiện.\n\n"
            "Hoàn tiền, nếu được chấp thuận, sẽ ưu tiên về phương thức thanh toán ban đầu hoặc phương thức "
            "được hai bên xác nhận. Thời gian xử lý phụ thuộc vào kết quả kiểm tra hàng hoàn và đối soát "
            "thanh toán."
        ),
    },
    {
        "title": "Chính sách bảo mật ThePawsome",
        "category": DocCategoryEnum.policy,
        "source_url": "/chinh-sach-bao-mat",
        "content": (
            "ThePawsome xử lý thông tin tài khoản, liên hệ, địa chỉ giao hàng, đơn hàng, thanh toán, "
            "hồ sơ thú cưng và hội thoại AI để cung cấp dịch vụ, hỗ trợ khách hàng, chống gian lận, "
            "bảo vệ hệ thống và cải thiện chất lượng trải nghiệm.\n\n"
            "Dữ liệu cần thiết có thể được chuyển tới các nhà cung cấp phục vụ chức năng người dùng yêu "
            "cầu như OpenAI cho trợ lý AI, Cloudinary cho hình ảnh, Google cho đăng nhập, đối tác thanh "
            "toán, email và hạ tầng vận hành. ThePawsome giới hạn dữ liệu theo mục đích xử lý và không "
            "bán dữ liệu cá nhân.\n\n"
            "ThePawsome không lưu thông tin thẻ hoặc thông tin đăng nhập ngân hàng. Hệ thống áp dụng "
            "kiểm soát truy cập, mã hóa khi truyền, nhật ký vận hành và che giấu dữ liệu nhạy cảm trong "
            "log khi phù hợp.\n\n"
            "Người dùng có thể yêu cầu xem, sửa, rút lại đồng ý, hạn chế xử lý hoặc xóa dữ liệu theo "
            "pháp luật áp dụng bằng cách liên hệ support@thepawsome.store. Một số dữ liệu giao dịch "
            "có thể cần được lưu trong thời gian cần thiết để xử lý đơn hàng, tranh chấp, bảo mật hoặc "
            "nghĩa vụ pháp lý."
        ),
    },
    {
        "title": "Điều khoản mua bán ThePawsome",
        "category": DocCategoryEnum.policy,
        "source_url": "/dieu-khoan-mua-ban",
        "content": (
            "Đơn hàng trên ThePawsome được ghi nhận khi hệ thống cấp mã đơn. Việc ghi nhận đơn chưa "
            "đồng nghĩa đơn đã được xác nhận giao thành công; ThePawsome có thể liên hệ để xác minh "
            "thông tin nhận hàng, tồn kho, giá hoặc thanh toán trước khi xử lý tiếp.\n\n"
            "Giá sản phẩm hiển thị bằng VND và có thể thay đổi trước thời điểm đặt hàng. Nếu phát hiện "
            "lỗi dữ liệu rõ ràng như sai giá, sai tồn kho, sai mô tả hoặc hình ảnh, ThePawsome sẽ thông "
            "báo cho khách hàng và cho phép xác nhận lại, thay thế sản phẩm hoặc hủy đơn.\n\n"
            "Người dùng có trách nhiệm cung cấp thông tin nhận hàng chính xác, bảo vệ tài khoản, không "
            "lạm dụng mã giảm giá, API, tính năng thanh toán hoặc trợ lý AI. Nội dung đánh giá, forum "
            "và hội thoại không được dùng để phát tán spam, thông tin gây hại hoặc yêu cầu vượt quyền.\n\n"
            "Catbot là trợ lý AI cung cấp thông tin tham khảo về chăm sóc thú cưng và sản phẩm. Catbot "
            "không thay thế bác sĩ thú y, không chẩn đoán, không kê thuốc và không được xem là cam kết "
            "y tế hoặc pháp lý. Khi cần quyết định y tế cho thú cưng, khách hàng nên liên hệ bác sĩ thú y."
        ),
    },
]


async def main():
    async with AsyncSessionLocal() as db:
        all_articles = [*ARTICLES, *FOOTER_SERVICE_ARTICLES]
        titles = [article["title"] for article in all_articles]
        result = await db.execute(
            select(KnowledgeDoc).where(KnowledgeDoc.title.in_(titles))
        )
        existing_by_title = {doc.title: doc for doc in result.scalars().all()}
        for art in all_articles:
            existing = existing_by_title.get(art["title"])
            source_url = art.get("source_url", SOURCE_URLS_BY_CATEGORY[art["category"]])
            if existing:
                existing.category = art["category"]
                existing.content = art["content"]
                existing.source_url = source_url
            else:
                db.add(KnowledgeDoc(
                    title=art["title"],
                    category=art["category"],
                    content=art["content"],
                    source_url=source_url,
                ))
        await db.commit()
        print(f"Seeded {len(all_articles)} knowledge articles.")
    await engine.dispose()


if __name__ == "__main__":
    asyncio.run(main())
