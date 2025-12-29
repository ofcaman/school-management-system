// Modern Template - Clean, minimalist design with subtle accents
export const modernTemplate = {
    portrait: {
      elements: [
        // Header with gradient background
        {
          id: "header-bg",
          type: "text",
          content: "",
          position: { x: 0, y: 0 },
          size: { width: 204, height: 60 },
          style: {
            backgroundColor: "#f8f9fa",
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
            color: "#3b82f6",
            textAlign: "center",
            borderRadius: 18,
            border: "2px solid #3b82f6",
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
            color: "#3b82f6",
            textAlign: "left",
          },
        },
        // Student Profile Banner
        {
          id: "profile-banner",
          type: "text",
          content: "Student ID",
          position: { x: 0, y: 60 },
          size: { width: 204, height: 24 },
          style: {
            fontSize: 12,
            fontWeight: "bold",
            color: "#ffffff",
            backgroundColor: "#3b82f6",
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
            borderRadius: 4,
            border: "3px solid #f8f9fa",
          },
        },
        // Name Label
        {
          id: "name-label",
          type: "text",
          content: "Name",
          position: { x: 100, y: 96 },
          size: { width: 60, height: 16 },
          style: {
            fontSize: 10,
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
          content: "Class",
          position: { x: 100, y: 136 },
          size: { width: 60, height: 16 },
          style: {
            fontSize: 10,
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
          content: "Address",
          position: { x: 100, y: 176 },
          size: { width: 60, height: 16 },
          style: {
            fontSize: 10,
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
          content: "Signature",
          position: { x: 120, y: 240 },
          size: { width: 60, height: 16 },
          style: {
            fontSize: 10,
            fontWeight: "normal",
            color: "#3b82f6",
            fontStyle: "italic",
            textAlign: "center",
          },
        },
        // Valid Until Banner
        {
          id: "valid-until-banner",
          type: "text",
          content: "Valid Until: 2082/12/30",
          position: { x: 0, y: 280 },
          size: { width: 204, height: 24 },
          style: {
            fontSize: 10,
            fontWeight: "bold",
            color: "#ffffff",
            backgroundColor: "#3b82f6",
            textAlign: "center",
          },
        },
        // Contact Info
        {
          id: "contact-info",
          type: "text",
          content: "If found, please contact: 9815277607",
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
        headerColor: "#f8f9fa",
        footerColor: "#f8f9fa",
        schoolName: "Sajha Boarding School",
        schoolAddress: "Chandrapur-7, Rautahat",
        schoolContact: "9815277607",
        academicYear: "2082",
        expiryDate: "2082/12/30",
      },
    },
    landscape: {
      elements: [
        // Header with gradient background
        {
          id: "header-bg",
          type: "text",
          content: "",
          position: { x: 0, y: 0 },
          size: { width: 324, height: 40 },
          style: {
            backgroundColor: "#f8f9fa",
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
            color: "#3b82f6",
            textAlign: "center",
            borderRadius: 14,
            border: "2px solid #3b82f6",
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
            color: "#3b82f6",
            textAlign: "left",
          },
        },
        // Student ID Banner
        {
          id: "profile-banner",
          type: "text",
          content: "Student ID",
          position: { x: 230, y: 10 },
          size: { width: 80, height: 20 },
          style: {
            fontSize: 10,
            fontWeight: "bold",
            color: "#ffffff",
            backgroundColor: "#3b82f6",
            textAlign: "center",
            borderRadius: 10,
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
            borderRadius: 4,
            border: "3px solid #f8f9fa",
          },
        },
        // Name Label
        {
          id: "name-label",
          type: "text",
          content: "Name",
          position: { x: 90, y: 48 },
          size: { width: 60, height: 16 },
          style: {
            fontSize: 10,
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
          content: "Class",
          position: { x: 90, y: 88 },
          size: { width: 60, height: 16 },
          style: {
            fontSize: 10,
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
          content: "Address",
          position: { x: 90, y: 128 },
          size: { width: 60, height: 16 },
          style: {
            fontSize: 10,
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
          content: "Signature",
          position: { x: 230, y: 128 },
          size: { width: 70, height: 16 },
          style: {
            fontSize: 10,
            fontWeight: "normal",
            color: "#3b82f6",
            fontStyle: "italic",
            textAlign: "center",
          },
        },
        // Valid Until Banner
        {
          id: "valid-until-banner",
          type: "text",
          content: "Valid Until: 2082/12/30",
          position: { x: 0, y: 170 },
          size: { width: 324, height: 20 },
          style: {
            fontSize: 10,
            fontWeight: "bold",
            color: "#ffffff",
            backgroundColor: "#3b82f6",
            textAlign: "center",
          },
        },
        // Contact Info
        {
          id: "contact-info",
          type: "text",
          content: "If found, please contact: 9815277607",
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
        headerColor: "#f8f9fa",
        footerColor: "#f8f9fa",
        schoolName: "Sajha Boarding School",
        schoolAddress: "Chandrapur-7, Rautahat",
        schoolContact: "9815277607",
        academicYear: "2082",
        expiryDate: "2082/12/30",
      },
    },
  }
  
  export default modernTemplate
  