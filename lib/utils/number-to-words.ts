// Function to convert numbers to words
export function convertToWords(num: number): string {
    const units = [
      "",
      "one",
      "two",
      "three",
      "four",
      "five",
      "six",
      "seven",
      "eight",
      "nine",
      "ten",
      "eleven",
      "twelve",
      "thirteen",
      "fourteen",
      "fifteen",
      "sixteen",
      "seventeen",
      "eighteen",
      "nineteen",
    ]
    const tens = ["", "", "twenty", "thirty", "forty", "fifty", "sixty", "seventy", "eighty", "ninety"]
  
    if (num === 0) return "zero"
  
    function convertLessThanThousand(n: number): string {
      if (n === 0) return ""
  
      if (n < 20) {
        return units[n] + " "
      }
  
      if (n < 100) {
        return tens[Math.floor(n / 10)] + (n % 10 !== 0 ? "-" + units[n % 10] : "") + " "
      }
  
      return units[Math.floor(n / 100)] + " hundred " + (n % 100 !== 0 ? "and " + convertLessThanThousand(n % 100) : "")
    }
  
    let result = ""
  
    // Handle crores (10 million)
    if (num >= 10000000) {
      result += convertLessThanThousand(Math.floor(num / 10000000)) + "crore "
      num %= 10000000
    }
  
    // Handle lakhs (100 thousand)
    if (num >= 100000) {
      result += convertLessThanThousand(Math.floor(num / 100000)) + "lakh "
      num %= 100000
    }
  
    // Handle thousands
    if (num >= 1000) {
      result += convertLessThanThousand(Math.floor(num / 1000)) + "thousand "
      num %= 1000
    }
  
    // Handle hundreds, tens and units
    result += convertLessThanThousand(num)
  
    return result.trim().charAt(0).toUpperCase() + result.trim().slice(1)
  }
  