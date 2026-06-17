import LegalPage from "@/components/legal/LegalPage";

export default function ShippingPolicyPage() {
  return (
    <LegalPage
      title="Chính sách giao hàng"
      intro="Thông tin giao hàng áp dụng cho phiên bản public demo của ThePawsome."
      sections={[
        { title: "Phạm vi và phí", paragraphs: ["Hệ thống hiện áp dụng phí giao hàng minh họa 30.000đ cho mỗi đơn. Phạm vi, thời gian và phí thực tế phải được xác nhận trước khi vận hành thương mại chính thức."] },
        { title: "Xử lý đơn", paragraphs: ["Đơn được chuyển qua các trạng thái chờ xử lý, đã xác nhận, đang giao và hoàn thành. Khách hàng có thể theo dõi trạng thái trong tài khoản hoặc tra cứu bằng email và mã đơn."] },
        { title: "Sự cố giao nhận", paragraphs: ["Khi kiện hàng hư hỏng, thiếu hàng hoặc giao sai, khách hàng nên chụp ảnh và liên hệ support@thepawsome.store sớm nhất để được kiểm tra."] },
      ]}
    />
  );
}
