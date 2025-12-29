"use client"

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase-config'; // Adjust the import path as needed
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2 } from 'lucide-react';
import dynamic from 'next/dynamic';

// Dynamically import dependencies
const QRCode = dynamic(() => import('react-qr-code').then(mod => mod.default), {
  ssr: false,
  loading: () => <div>Loading QR Code...</div>,
});
const html2canvas = typeof window !== 'undefined' ? require('html2canvas') : null;
const JSZip = typeof window !== 'undefined' ? require('jszip') : null;
const { saveAs } = typeof window !== 'undefined' ? require('file-saver') : null;

export default function IDCardForClassPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [students, setStudents] = useState([]);
  const [selectedGrade, setSelectedGrade] = useState('');
  const [grades, setGrades] = useState<string[]>([]);
  const idCardRefs = useRef<(HTMLDivElement | null)[]>([]);

  useEffect(() => {
    const fetchGradesAndStudents = async () => {
      try {
        const studentsRef = collection(db, 'students');
        const studentsSnapshot = await getDocs(studentsRef);
        const uniqueGrades = new Set(studentsSnapshot.docs.map(doc => doc.data().grade));
        setGrades(['All', ...Array.from(uniqueGrades).sort()]);
        setLoading(false);
      } catch (error) {
        console.error('Error fetching grades:', error);
        setLoading(false);
      }
    };
    fetchGradesAndStudents();
  }, []);

  const fetchStudentsByGrade = async (grade: string) => {
    setLoading(true);
    try {
      const studentsRef = collection(db, 'students');
      const q = grade === 'All' ? studentsRef : query(studentsRef, where('grade', '==', grade));
      const querySnapshot = await getDocs(q);
      const studentList = querySnapshot.docs.map(doc => doc.data());
      setStudents(studentList);
    } catch (error) {
      console.error('Error fetching students:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (selectedGrade) {
      fetchStudentsByGrade(selectedGrade);
    }
  }, [selectedGrade]);

  const generateQRData = (student: any) => {
    const fullName = student.middleName ? `${student.firstName} ${student.middleName} ${student.lastName}` : `${student.firstName} ${student.lastName}`;
    return `Grade: ${student.grade}, Name: ${fullName}, Roll: ${student.rollNumber}`;
  };

  const downloadAllAsZip = async () => {
    if (!html2canvas || !JSZip || !saveAs) return;

    const zip = new JSZip();
    const promises = idCardRefs.current.map(async (idCard, index) => {
      if (idCard) {
        const canvas = await html2canvas(idCard);
        return new Promise((resolve) => {
          canvas.toBlob((blob) => {
            if (blob) {
              const fullName = students[index].middleName
                ? `${students[index].firstName} ${students[index].middleName} ${students[index].lastName}`
                : `${students[index].firstName} ${students[index].lastName}`;
              zip.file(`${fullName}_ID_Card.png`, blob);
              resolve(null);
            }
          });
        });
      }
    });

    await Promise.all(promises);
    zip.generateAsync({ type: 'blob' }).then((content) => {
      saveAs(content, 'ID_Cards.zip');
    });
  };

  return (
    <div className="container py-6 max-w-4xl">
      <div className="flex items-center mb-6">
        <Button variant="ghost" onClick={() => router.back()} className="mr-4">
          <span className="mr-2">←</span> Back
        </Button>
        <h1 className="text-2xl font-bold">Generate ID Cards by Class</h1>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Select Grade to Generate ID Cards</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center">
              <Loader2 className="h-8 w-8 animate-spin" />
            </div>
          ) : (
            <>
              <div className="mb-4 flex space-x-2">
                <Button onClick={downloadAllAsZip}>Download All as ZIP</Button>
              </div>
              <div className="mb-4">
                <Select onValueChange={setSelectedGrade} value={selectedGrade}>
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="Select grade" />
                  </SelectTrigger>
                  <SelectContent>
                    {grades.map((grade) => (
                      <SelectItem key={grade} value={grade}>
                        {grade}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              {selectedGrade && (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
                  {students.map((student, index) => {
                    const fullName = student.middleName ? `${student.firstName} ${student.middleName} ${student.lastName}` : `${student.firstName} ${student.lastName}`;
                    return (
                      <div
                        key={index}
                        ref={(el) => (idCardRefs.current[index] = el)}
                        className="id-card"
                        style={{
                          width: '300px',
                          border: '1px solid #ccc',
                          backgroundImage: 'linear-gradient(to bottom, #f0f0f0, #fff)',
                          padding: '10px',
                          position: 'relative',
                          fontFamily: 'Arial, sans-serif',
                        }}
                      >
                        {/* Header */}
                        <div style={{
                          backgroundColor: '#00aaff',
                          color: 'white',
                          padding: '5px',
                          borderTopLeftRadius: '5px',
                          borderTopRightRadius: '5px',
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: 'center',
                        }}>
                          <div style={{ display: 'flex', alignItems: 'center', width: '100%' }}>
                            <img src="/sajha-logo.png" alt="School Logo" style={{ width: '60px', marginRight: '10px' }} />
                            <div>
                              <h3 style={{ margin: '0', fontSize: '16px' }}>Sajha Boarding School</h3>
                              <p style={{ margin: '0', fontSize: '12px' }}>Chandrapur-7, Rautahat</p>
                              <p style={{ margin: '0', fontSize: '12px' }}>📞 9815285223</p>
                            </div>
                          </div>
                        </div>

                        {/* Main Content */}
                        <div style={{ padding: '10px', textAlign: 'center' }}>
                          <h2 style={{ color: '#ff0000', fontSize: '20px', margin: '10px 0' }}>STUDENT ID</h2>
                          <div style={{
                            position: 'relative',
                            marginBottom: '10px',
                            width: '150px',
                            margin: '0 auto',
                          }}>
                            <img
                              src={student.profilePictureUrl || 'https://via.placeholder.com/100'}
                              alt="Student Profile"
                              style={{
                                width: '100px',
                                height: '100px',
                                margin: '0 auto',
                                border: '2px solid #fff',
                                borderRadius: '5px',
                              }}
                            />
                          </div>
                          <p style={{ fontSize: '16px', fontWeight: 'bold', margin: '10px 0' }}>{fullName}</p>
                          <p><strong>Grade :</strong> {student.grade} {student.section ? `Section ${student.section}` : ''}</p>
                          <p><strong>Guardian :</strong> {student.fatherName}</p>
                          <p><strong>Contact :</strong> {student.contactNumber}</p>
                          <p><strong>Address :</strong> {student.address || 'Chandrapur-7, Rautahat'}</p>
                        </div>

                        {/* Bottom Section */}
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px', borderTop: '1px solid #ccc' }}>
                          <div>
                            {QRCode ? <QRCode value={generateQRData(student)} size={40} /> : <div>QRCode not loaded</div>}
                          </div>
                          <div style={{ textAlign: 'right' }}>
                            <img src="/sign.png" alt="Principal Signature" style={{ width: '80px', marginBottom: '5px' }} />
                            <p style={{ margin: '0', fontSize: '12px' }}>Principal</p>
                          </div>
                        </div>

                        {/* Footer */}
                        <div style={{
                          backgroundColor: '#ff0000',
                          color: 'white',
                          textAlign: 'center',
                          padding: '5px',
                          borderBottomLeftRadius: '5px',
                          borderBottomRightRadius: '5px',
                        }}>
                          <p style={{ margin: '0', fontSize: '14px' }}>Valid upto : 2082/12/30</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}