import LegalPage from "@/components/legal/LegalPage";

export default function TermsPage() {
  return (
    <LegalPage
      title="Điều khoản mua bán"
      intro="Các điều khoản cơ bản áp dụng cho giao dịch đặt hàng trên ThePawsome."
      sections={[
        { title: "Xác lập đơn hàng", paragraphs: ["Đơn hàng được ghi nhận khi hệ thống cấp mã đơn. ThePawsome có thể liên hệ để xác minh thông tin, tồn kho hoặc địa chỉ trước khi xác nhận giao hàng."] },
        { title: "Giá và thông tin sản phẩm", paragraphs: ["Giá hiển thị bằng VND và có thể thay đổi trước khi đặt hàng. Trường hợp lỗi dữ liệu rõ ràng, chúng tôi sẽ thông báo và cho phép khách hàng xác nhận lại hoặc hủy đơn."] },
        { title: "Trách nhiệm người dùng", paragraphs: ["Người dùng cung cấp thông tin nhận hàng chính xác, bảo vệ tài khoản và không lạm dụng API, thanh toán hoặc tính năng AI."] },
        { title: "Trợ lý AI", paragraphs: ["Catbot là AI cung cấp thông tin tham khảo, không chẩn đoán hay kê thuốc. Luật Trí tuệ nhân tạo số 134/2025/QH15 được dùng làm tham chiếu minh bạch cho tính năng AI."] },
      ]}
    />
  );
}
