// Professional Template - Corporate style with clean lines and professional colors
export const professionalTemplate = {
    portrait: {
      elements: [
        // Header background
        {
          id: "header-bg",
          type: "text",
          content: "",
          position: { x: 0, y: 0 },
          size: { width: 204, height: 60 },
          style: {
            backgroundColor: "#1e293b",
            borderRadius: 0,
            border: "none",
          },
        },
        // School Logo
        {
          id: "school-logo",
          type: "text",
          content: "School\nLogo",
          position: { x: 12, y: 12 },
          size: { width: 36, height: 36 },
          style: {
            fontSize: 10,
            fontWeight: "bold",
            color: "#ffffff",
            textAlign: "center",
            borderRadius: 18,
            border: "2px solid #ffffff",
          },
        },
        // School Name
        {
          id: "school-name",
          type: "text",
          content: "Sajha Boarding\nSchool",
          position: { x: 54, y: 12 },
          size: { width: 140, height: 36 },
          style: {
            fontSize: 14,
            fontWeight: "bold",
            color: "#ffffff",
            textAlign: "left",
          },
        },
        // Student Profile Banner
        {
          id: "profile-banner",
          type: "text",
          content: "STUDENT IDENTIFICATION",
          position: { x: 0, y: 60 },
          size: { width: 204, height: 24 },
          style: {
            fontSize: 10,
            fontWeight: "bold",
            color: "#1e293b",
            backgroundColor: "#e2e8f0",
            textAlign: "center",
          },
        },
        // Student Photo
        {
          id: "student-photo",
          type: "field",
          content: "profilePictureUrl",
          position: { x: 12, y: 96 },
          size: { width: 80, height: 100 },
          style: {
            borderRadius: 0,
            border: "1px solid #94a3b8",
          },
        },
        // Name Label
        {
          id: "name-label",
          type: "text",
          content: "FULL NAME",
          position: { x: 100, y: 96 },
          size: { width: 60, height: 16 },
          style: {
            fontSize: 8,
            fontWeight: "bold",
            color: "#64748b",
            textAlign: "left",
          },
        },
        // Name Value
        {
          id: "name-value",
          type: "field",
          content: "name",
          position: { x: 100, y: 112 },
          size: { width: 92, height: 20 },
          style: {
            fontSize: 12,
            fontWeight: "bold",
            color: "#1e293b",
            textAlign: "left",
          },
        },
        // Class Label
        {
          id: "class-label",
          type: "text",
          content: "CLASS",
          position: { x: 100, y: 136 },
          size: { width: 60, height: 16 },
          style: {
            fontSize: 8,
            fontWeight: "bold",
            color: "#64748b",
            textAlign: "left",
          },
        },
        // Class Value
        {
          id: "class-value",
          type: "field",
          content: "grade",
          position: { x: 100, y: 152 },
          size: { width: 92, height: 20 },
          style: {
            fontSize: 12,
            fontWeight: "normal",
            color: "#1e293b",
            textAlign: "left",
          },
        },
        // Address Label
        {
          id: "address-label",
          type: "text",
          content: "ADDRESS",
          position: { x: 100, y: 176 },
          size: { width: 60, height: 16 },
          style: {
            fontSize: 8,
            fontWeight: "bold",
            color: "#64748b",
            textAlign: "left",
          },
        },
        // Address Value
        {
          id: "address-value",
          type: "field",
          content: "address",
          position: { x: 100, y: 192 },
          size: { width: 92, height: 20 },
          style: {
            fontSize: 12,
            fontWeight: "normal",
            color: "#1e293b",
            textAlign: "left",
          },
        },
        // QR Code
        {
          id: "qrcode",
          type: "qrcode",
          content: "name,grade,rollNumber",
          position: { x: 12, y: 208 },
          size: { width: 60, height: 60 },
          style: {},
        },
        // Signature
        {
          id: "signature",
          type: "text",
          content: "Principal's Signature",
          position: { x: 100, y: 240 },
          size: { width: 92, height: 16 },
          style: {
            fontSize: 10,
            fontWeight: "normal",
            color: "#1e293b",
            fontStyle: "italic",
            textAlign: "center",
          },
        },
        // Divider
        {
          id: "divider",
          type: "text",
          content: "",
          position: { x: 100, y: 238 },
          size: { width: 92, height: 1 },
          style: {
            backgroundColor: "#94a3b8",
            borderRadius: 0,
            border: "none",
          },
        },
        // Valid Until Banner
        {
          id: "valid-until-banner",
          type: "text",
          content: "VALID UNTIL: 2082/12/30",
          position: { x: 0, y: 280 },
          size: { width: 204, height: 24 },
          style: {
            fontSize: 10,
            fontWeight: "bold",
            color: "#ffffff",
            backgroundColor: "#1e293b",
            textAlign: "center",
          },
        },
        // Contact Info
        {
          id: "contact-info",
          type: "text",
          content: "If found, please return to: 9815277607",
          position: { x: 12, y: 310 },
          size: { width: 180, height: 16 },
          style: {
            fontSize: 8,
            fontWeight: "normal",
            color: "#64748b",
            textAlign: "center",
          },
        },
      ],
      settings: {
        headerColor: "#1e293b",
        footerColor: "#1e293b",
        schoolName: "Sajha Boarding School",
        schoolAddress: "Chandrapur-7, Rautahat",
        schoolContact: "9815277607",
        academicYear: "2082",
        expiryDate: "2082/12/30",
      },
    },
    landscape: {
      elements: [
        // Header background
        {
          id: "header-bg",
          type: "text",
          content: "",
          position: { x: 0, y: 0 },
          size: { width: 324, height: 40 },
          style: {
            backgroundColor: "#1e293b",
            borderRadius: 0,
            border: "none",
          },
        },
        // School Logo
        {
          id: "school-logo",
          type: "text",
          content: "School\nLogo",
          position: { x: 12, y: 6 },
          size: { width: 28, height: 28 },
          style: {
            fontSize: 8,
            fontWeight: "bold",
            color: "#ffffff",
            textAlign: "center",
            borderRadius: 14,
            border: "2px solid #ffffff",
          },
        },
        // School Name
        {
          id: "school-name",
          type: "text",
          content: "Sajha Boarding School",
          position: { x: 48, y: 10 },
          size: { width: 140, height: 20 },
          style: {
            fontSize: 12,
            fontWeight: "bold",
            color: "#ffffff",
            textAlign: "left",
          },
        },
        // Student ID Banner
        {
          id: "profile-banner",
          type: "text",
          content: "STUDENT ID",
          position: { x: 230, y: 10 },
          size: { width: 80, height: 20 },
          style: {
            fontSize: 10,
            fontWeight: "bold",
            color: "#1e293b",
            backgroundColor: "#e2e8f0",
            textAlign: "center",
            borderRadius: 0,
          },
        },
        // Student Photo
        {
          id: "student-photo",
          type: "field",
          content: "profilePictureUrl",
          position: { x: 12, y: 48 },
          size: { width: 70, height: 90 },
          style: {
            borderRadius: 0,
            border: "1px solid #94a3b8",
          },
        },
        // Name Label
        {
          id: "name-label",
          type: "text",
          content: "FULL NAME",
          position: { x: 90, y: 48 },
          size: { width: 60, height: 16 },
          style: {
            fontSize: 8,
            fontWeight: "bold",
            color: "#64748b",
            textAlign: "left",
          },
        },
        // Name Value
        {
          id: "name-value",
          type: "field",
          content: "name",
          position: { x: 90, y: 64 },
          size: { width: 100, height: 20 },
          style: {
            fontSize: 12,
            fontWeight: "bold",
            color: "#1e293b",
            textAlign: "left",
          },
        },
        // Class Label
        {
          id: "class-label",
          type: "text",
          content: "CLASS",
          position: { x: 90, y: 88 },
          size: { width: 60, height: 16 },
          style: {
            fontSize: 8,
            fontWeight: "bold",
            color: "#64748b",
            textAlign: "left",
          },
        },
        // Class Value
        {
          id: "class-value",
          type: "field",
          content: "grade",
          position: { x: 90, y: 104 },
          size: { width: 100, height: 20 },
          style: {
            fontSize: 12,
            fontWeight: "normal",
            color: "#1e293b",
            textAlign: "left",
          },
        },
        // Address Label
        {
          id: "address-label",
          type: "text",
          content: "ADDRESS",
          position: { x: 90, y: 128 },
          size: { width: 60, height: 16 },
          style: {
            fontSize: 8,
            fontWeight: "bold",
            color: "#64748b",
            textAlign: "left",
          },
        },
        // Address Value
        {
          id: "address-value",
          type: "field",
          content: "address",
          position: { x: 90, y: 144 },
          size: { width: 100, height: 20 },
          style: {
            fontSize: 12,
            fontWeight: "normal",
            color: "#1e293b",
            textAlign: "left",
          },
        },
        // QR Code
        {
          id: "qrcode",
          type: "qrcode",
          content: "name,grade,rollNumber",
          position: { x: 230, y: 48 },
          size: { width: 70, height: 70 },
          style: {},
        },
        // Signature
        {
          id: "signature",
          type: "text",
          content: "Principal's Signature",
          position: { x: 230, y: 128 },
          size: { width: 70, height: 16 },
          style: {
            fontSize: 8,
            fontWeight: "normal",
            color: "#1e293b",
            fontStyle: "italic",
            textAlign: "center",
          },
        },
        // Divider
        {
          id: "divider",
          type: "text",
          content: "",
          position: { x: 230, y: 126 },
          size: { width: 70, height: 1 },
          style: {
            backgroundColor: "#94a3b8",
            borderRadius: 0,
            border: "none",
          },
        },
        // Valid Until Banner
        {
          id: "valid-until-banner",
          type: "text",
          content: "VALID UNTIL: 2082/12/30",
          position: { x: 0, y: 170 },
          size: { width: 324, height: 20 },
          style: {
            fontSize: 10,
            fontWeight: "bold",
            color: "#ffffff",
            backgroundColor: "#1e293b",
            textAlign: "center",
          },
        },
        // Contact Info
        {
          id: "contact-info",
          type: "text",
          content: "If found, please return to: 9815277607",
          position: { x: 12, y: 195 },
          size: { width: 300, height: 16 },
          style: {
            fontSize: 8,
            fontWeight: "normal",
            color: "#64748b",
            textAlign: "center",
          },
        },
      ],
      settings: {
        headerColor: "#1e293b",
        footerColor: "#1e293b",
        schoolName: "Sajha Boarding School",
        schoolAddress: "Chandrapur-7, Rautahat",
        schoolContact: "9815277607",
        academicYear: "2082",
        expiryDate: "2082/12/30",
      },
    },
  }
  
  export default professionalTemplate
  