"use client";

// 발주서/작업지시서 A4 인쇄 시트 (window.print()로 출력)
// 화면에서는 숨김(.print-area), 인쇄 시 globals.css의 @media print 규칙으로만 표시

import React from "react";
import { won } from "@/components/erp/labels";
import type { OrderNote } from "@/types";

export function OrderPrintSheet({ order }: { order: OrderNote | null }) {
  if (!order) return null;
  const today = new Date().toLocaleDateString("ko-KR");
  return (
    <div className="print-area" aria-hidden="true">
      {/* 회사 레터헤드 */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", borderBottom: "3px double #0f172a", paddingBottom: 10 }}>
        <div>
          <div style={{ fontSize: "22pt", fontWeight: 800, letterSpacing: "0.35em" }}>발 주 서</div>
          <div style={{ fontSize: "8pt", color: "#475569", marginTop: 4 }}>PURCHASE ORDER · FlowHub 협업 플랫폼</div>
        </div>
        <div style={{ textAlign: "right", fontSize: "9pt", color: "#334155", lineHeight: 1.6 }}>
          <div>발주번호: <b>{order.orderNo}</b></div>
          <div>발행일: {today}</div>
          <div>납기일: {order.dueDate ? new Date(order.dueDate).toLocaleDateString("ko-KR") : "미정"}</div>
        </div>
      </div>

      {/* 거래처 / 공급자 */}
      <table style={{ marginTop: 14 }}>
        <tbody>
          <tr>
            <th style={{ width: "18%" }}>거래처</th>
            <td>{order.partnerName}{order.partnerContact ? ` (${order.partnerContact})` : ""}</td>
            <th style={{ width: "18%" }}>공급자</th>
            <td>FlowHub 제작팀 (대표 김민준)</td>
          </tr>
          <tr>
            <th>연락처</th>
            <td>{order.partnerContact || "-"}</td>
            <th>등록번호</th>
            <td>120-81-00000</td>
          </tr>
          <tr>
            <th>비고</th>
            <td colSpan={3}>{order.memo || "-"}</td>
          </tr>
        </tbody>
      </table>

      {/* 품목 */}
      <table style={{ marginTop: 10 }}>
        <thead>
          <tr>
            <th style={{ width: 34 }}>No.</th>
            <th>품명</th>
            <th style={{ width: 88 }}>규격</th>
            <th style={{ width: 44 }}>수량</th>
            <th style={{ width: 30 }}>단위</th>
            <th style={{ width: 88 }}>단가</th>
            <th style={{ width: 100 }}>금액</th>
          </tr>
        </thead>
        <tbody>
          {order.items.map((it, i) => (
            <tr key={i}>
              <td style={{ textAlign: "center" }}>{i + 1}</td>
              <td>{it.name}</td>
              <td>{it.spec || "-"}</td>
              <td style={{ textAlign: "right" }}>{it.qty.toLocaleString()}</td>
              <td style={{ textAlign: "center" }}>{it.unit}</td>
              <td style={{ textAlign: "right" }}>{it.unitPrice.toLocaleString()}</td>
              <td style={{ textAlign: "right" }}>{(it.amount ?? Math.round(it.qty * it.unitPrice)).toLocaleString()}</td>
            </tr>
          ))}
          {order.items.length === 0 && (
            <tr><td colSpan={7} style={{ textAlign: "center", color: "#64748b" }}>품목 없음</td></tr>
          )}
        </tbody>
        <tfoot>
          <tr>
            <th colSpan={6} style={{ textAlign: "right" }}>공급가액</th>
            <td style={{ textAlign: "right" }}><b>{won(order.supplyAmount)}</b></td>
          </tr>
          <tr>
            <th colSpan={6} style={{ textAlign: "right" }}>부가세 (10%)</th>
            <td style={{ textAlign: "right" }}>{won(order.vatAmount)}</td>
          </tr>
          <tr>
            <th colSpan={6} style={{ textAlign: "right", fontSize: "12pt" }}>합 계</th>
            <td style={{ textAlign: "right", fontSize: "12pt" }}><b>{won(order.totalAmount)}</b></td>
          </tr>
        </tfoot>
      </table>

      {/* 결제/도장 */}
      <table style={{ marginTop: 10 }}>
        <tbody>
          <tr>
            <th style={{ width: "18%" }}>결제 방식</th>
            <td>세금계산서 발행 / 계좌이체</td>
            <th style={{ width: "18%" }}>결제 상태</th>
            <td>{order.paymentStatus === "PAID" ? "입금 완료" : order.paymentStatus === "PARTIAL" ? "일부 수령" : "미수금"}</td>
          </tr>
        </tbody>
      </table>

      <div style={{ marginTop: 26, display: "flex", justifyContent: "space-between", fontSize: "10pt" }}>
        <div>
          <div>위 발주 내용을 확인하고 아래 서명합니다.</div>
          <div style={{ marginTop: 18 }}>수신처: ______________________ (인)</div>
        </div>
        <div style={{ textAlign: "center" }}>
          <div style={{ fontSize: "11pt", fontWeight: 700 }}>FlowHub 제작 주식회사</div>
          <div style={{ marginTop: 6, color: "#334155" }}>서울특별시 강서구 마곡중앙로 161</div>
          <div style={{ marginTop: 22 }}>대 표&nbsp;&nbsp;김 민 준&nbsp;&nbsp;(인)</div>
        </div>
      </div>
      <div style={{ marginTop: 18, fontSize: "8pt", color: "#64748b", textAlign: "center" }}>
        본 발주서는 FlowHub(플로우허브)에서 자동 생성되었습니다. · {order.orderNo} · {today} 출력
      </div>
    </div>
  );
}
