import React from "react";
import logo from "@/assets/logo.jpeg";

/**
 * PrescriptionPadV2
 * Hospital prescription (Rx) letterhead — patient fields at the top,
 * branding + icon at the bottom, thick green base bar.
 */

interface PrescriptionPadV2Props {
  hospitalName?: string;
  slogan?: string;
  addressLine1?: string;
  addressLine2?: string;
  phone?: string;
  email?: string;
  website?: string;
  green?: string;
  darkGreen?: string;
  gray?: string;
  patientName?: string;
  patientAge?: string;
  patientSex?: string;
  date?: string;
  medications?: Array<{
    name: string;
    dosage: string;
    frequency: string;
    duration: string;
    instructions?: string;
  }>;
  notes?: string;
}

const DottedField: React.FC<{ children?: React.ReactNode }> = ({ children }) => (
  <span
    style={{
      display: "inline-block",
      flex: 1,
      borderBottom: "1px dotted #9a9a9a",
      minWidth: 24,
      marginLeft: 6,
    }}
  >
    {children}
  </span>
);

const MedicalBasketIcon: React.FC<{ green: string; darkGreen: string; gray: string }> = ({
  green,
  darkGreen,
  gray,
}) => (
  <svg
    viewBox="0 0 120 110"
    style={{ width: "100%", height: "100%" }}
    xmlns="http://www.w3.org/2000/svg"
  >
    {/* leaves growing out of the basket */}
    <path
      d="M45,45 C30,35 22,18 28,4 C42,10 50,26 48,42 Z"
      fill={green}
    />
    <path
      d="M55,45 C60,28 78,16 96,18 C92,32 78,44 60,46 Z"
      fill={green}
    />
    <path d="M62,44 C66,30 80,20 92,20 L78,36 Z" fill={darkGreen} />
    {/* small dark leaf accent */}
    <path d="M70,40 L94,16 L98,22 L74,44 Z" fill="#2b2b2b" opacity="0.85" />

    {/* basket body (trapezoid) */}
    <path
      d="M18,52 L102,52 L92,100 C91,104 87,107 83,107 L37,107
         C33,107 29,104 28,100 Z"
      fill={gray}
    />
    {/* basket rim */}
    <rect x="10" y="44" width="100" height="12" rx="4" fill={gray} />

    {/* cross */}
    <rect x="52" y="66" width="16" height="34" rx="2" fill="#ffffff" />
    <rect x="43" y="75" width="34" height="16" rx="2" fill="#ffffff" />
  </svg>
);

const PrescriptionPadV2: React.FC<PrescriptionPadV2Props> = ({
  hospitalName = "Medi Consult",
  slogan = "Your Health, Our Priority",
  addressLine1 = "123 Healthcare Street",
  addressLine2 = "Medical District, City 12345",
  phone = "0123456789",
  email = "mediconsult@email.com",
  website = "www.mediconsult.com",
  green = "#7cb342",
  darkGreen = "#33691e",
  gray = "#8a8f94",
  patientName = "",
  patientAge = "",
  patientSex = "",
  date = "",
  medications = [],
  notes = "",
}) => {
  return (
    <div
      style={{
        position: "relative",
        width: "100%",
        maxWidth: 480,
        aspectRatio: "380 / 540",
        margin: "0 auto",
        background: "#ffffff",
        boxShadow: "0 0 0 1px #e5e5e5",
        overflow: "hidden",
        fontFamily: "'Segoe UI', Arial, Helvetica, sans-serif",
        display: "flex",
        flexDirection: "column",
      }}
    >
      {/* Watermark */}
      <div
        style={{
          position: "absolute",
          top: "50%",
          left: "50%",
          transform: "translate(-50%, -50%) rotate(-30deg)",
          opacity: 0.05,
          pointerEvents: "none",
          zIndex: 0,
        }}
      >
        <img
          src={logo}
          alt="Watermark"
          style={{
            width: "60%",
            height: "auto",
            maxWidth: 300,
          }}
        />
      </div>
      {/* top hairline */}
      <div style={{ height: 2, background: "#e2e2e2" }} />

      {/* patient info fields */}
      <div
        style={{
          padding: "3% 6% 0 6%",
          fontSize: "clamp(8px, 2.1cqw, 10.5px)",
          color: "#4a4a4a",
        }}
      >
        <div style={{ display: "flex", alignItems: "flex-end" }}>
          <span>Name :</span>
          <DottedField>{patientName || " "}</DottedField>
          <span style={{ marginLeft: 10, whiteSpace: "nowrap" }}>Age :</span>
          <DottedField>{patientAge || " "}</DottedField>
          <span style={{ marginLeft: 10, whiteSpace: "nowrap" }}>Sex :</span>
          <DottedField>{patientSex || " "}</DottedField>
          <span style={{ marginLeft: 10, whiteSpace: "nowrap" }}>Date :</span>
          <DottedField>{date || " "}</DottedField>
        </div>
      </div>

      {/* Logo instead of Rx */}
      <div
        style={{
          padding: "2% 0 0 6%",
        }}
      >
        <img
          src={logo}
          alt="Premedi Lanka Logo"
          style={{
            height: "clamp(30px, 8cqw, 50px)",
            width: "auto",
            objectFit: "contain",
          }}
        />
      </div>

      {/* medications table */}
      {medications && medications.length > 0 && (
        <div style={{ padding: "2% 6%", flex: 1 }}>
          <table
            style={{
              width: "100%",
              borderCollapse: "collapse",
              fontSize: "clamp(7px, 1.8cqw, 9px)",
            }}
          >
            <thead>
              <tr style={{ borderBottom: "1px solid #000" }}>
                <th style={{ padding: "4px", textAlign: "left", fontWeight: "bold" }}>#</th>
                <th style={{ padding: "4px", textAlign: "left", fontWeight: "bold" }}>Medicine</th>
                <th style={{ padding: "4px", textAlign: "left", fontWeight: "bold" }}>Dosage</th>
                <th style={{ padding: "4px", textAlign: "left", fontWeight: "bold" }}>Freq</th>
                <th style={{ padding: "4px", textAlign: "left", fontWeight: "bold" }}>Duration</th>
              </tr>
            </thead>
            <tbody>
              {medications.map((med, index) => (
                <tr key={index} style={{ borderBottom: "1px dotted #ccc" }}>
                  <td style={{ padding: "4px" }}>{index + 1}</td>
                  <td style={{ padding: "4px" }}>{med.name}</td>
                  <td style={{ padding: "4px" }}>{med.dosage}</td>
                  <td style={{ padding: "4px" }}>{med.frequency}</td>
                  <td style={{ padding: "4px" }}>{med.duration}</td>
                </tr>
              ))}
            </tbody>
          </table>

          {medications.some(m => m.instructions) && (
            <div style={{ marginTop: "8px", fontSize: "clamp(7px, 1.8cqw, 9px)" }}>
              <strong>Instructions:</strong>
              <ul style={{ margin: "4px 0", paddingLeft: "16px" }}>
                {medications.map((med, index) => (
                  med.instructions && (
                    <li key={index}>
                      {med.name}: {med.instructions}
                    </li>
                  )
                ))}
              </ul>
            </div>
          )}

          {notes && (
            <div style={{ marginTop: "8px", fontSize: "clamp(7px, 1.8cqw, 9px)" }}>
              <strong>Additional Notes:</strong>
              <p style={{ margin: "4px 0" }}>{notes}</p>
            </div>
          )}
        </div>
      )}

      {/* empty writing area if no medications */}
      {!medications || medications.length === 0 ? (
        <div style={{ flex: 1 }} />
      ) : null}

      {/* bottom branding row */}
      <div
        style={{
          position: "relative",
          padding: "0 6% 4% 6%",
          display: "flex",
          alignItems: "flex-end",
          justifyContent: "space-between",
        }}
      >
        <div>
          <div
            style={{
              color: green,
              fontFamily: "'Comic Sans MS', 'Segoe Print', 'Trebuchet MS', sans-serif",
              fontWeight: 700,
              fontSize: "clamp(16px, 5cqw, 24px)",
              marginBottom: 4,
            }}
          >
            {hospitalName}
          </div>
          <div style={{ fontSize: "clamp(8px, 2cqw, 10px)", color: "#555", marginBottom: 8 }}>
            {slogan}
          </div>
          <div
            style={{
              fontSize: "clamp(7px, 1.8cqw, 9px)",
              color: "#555",
              lineHeight: 1.5,
              marginBottom: 6,
            }}
          >
            <div>{addressLine1}</div>
            <div>{addressLine2}</div>
          </div>
          <div style={{ fontSize: "clamp(7px, 1.8cqw, 9px)", color: "#555", lineHeight: 1.5 }}>
            <div>Phone : {phone}</div>
            <div style={{ textDecoration: "underline" }}>{email}</div>
            <div style={{ textDecoration: "underline" }}>{website}</div>
          </div>
        </div>

        <div style={{ width: "22%", minWidth: 60, marginLeft: 12 }}>
          <MedicalBasketIcon green={green} darkGreen={darkGreen} gray={gray} />
        </div>
      </div>

      {/* thick base bar */}
      <div style={{ height: "3.5%", background: green, flexShrink: 0 }} />
    </div>
  );
};

export default PrescriptionPadV2;
