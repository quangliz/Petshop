import LegalPage from "@/components/legal/LegalPage";

export default function ReturnPolicyPage() {
  return (
    <LegalPage
      title="Chính sách đổi trả"
      intro="Baseline đổi trả dành cho hàng hóa pet retail; quy trình return/refund tự phục vụ thuộc Phase 1."
      sections={[
        { title: "Điều kiện tiếp nhận", paragraphs: ["Sản phẩm giao sai, hư hỏng do vận chuyển hoặc có lỗi có thể được xem xét khi còn đủ bằng chứng, bao bì và trong thời hạn được công bố cho từng nhóm hàng."] },
        { title: "Ngoại lệ", paragraphs: ["Thức ăn đã mở, sản phẩm vệ sinh đã sử dụng và hàng ảnh hưởng an toàn sức khỏe có thể không đủ điều kiện đổi trả, trừ khi có lỗi từ nhà bán hoặc nhà sản xuất."] },
        { title: "Cách yêu cầu", paragraphs: ["Gửi mã đơn, lý do và hình ảnh tới help@thepawsome.store. Nhân viên sẽ xác minh trước khi hướng dẫn gửi hàng hoặc hoàn tiền."] },
      ]}
    />
  );
}
