import LegalPage from "@/components/legal/LegalPage";

export default function PaymentPolicyPage() {
  return (
    <LegalPage
      title="Chính sách thanh toán"
      intro="ThePawsome hỗ trợ thanh toán khi nhận hàng và VNPay sandbox trong phạm vi public demo."
      sections={[
        { title: "COD", paragraphs: ["Khách hàng thanh toán khi nhận hàng. Đơn chỉ được ghi nhận doanh thu khi quy trình vận hành xác nhận phù hợp."] },
        { title: "VNPay", paragraphs: ["ThePawsome chuyển người dùng tới VNPay và xác nhận giao dịch bằng IPN có chữ ký. Trạng thái trên trình duyệt không tự quyết định kết quả thanh toán. Hệ thống không lưu số thẻ."] },
        { title: "Giao dịch cần đối soát", paragraphs: ["Nếu thanh toán thành công sau khi thời gian giữ hàng hết hoặc callback chưa đồng bộ, hệ thống đánh dấu đối soát. Khách hàng không nên thanh toán lại và cần liên hệ hỗ trợ."] },
      ]}
    />
  );
}
