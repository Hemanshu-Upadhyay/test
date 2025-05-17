"use client";
import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
// Remove the direct import
// import html2pdf from "html2pdf.js";

export default function TestPage() {
  // State variables remain the same
  const [studentInfo, setStudentInfo] = useState({
    name: "",
    email: "",
  });
  const [testStarted, setTestStarted] = useState(false);
  const [startTime, setStartTime] = useState(null);
  const [isVisible, setIsVisible] = useState(true);
  const [submitted, setSubmitted] = useState(false);
  const [remainingTime, setRemainingTime] = useState(7200); // 2 hours in seconds
  const [switchCount, setSwitchCount] = useState(0);
  const [answers, setAnswers] = useState({});
  const [focusEvents, setFocusEvents] = useState([]);
  const [showWarning, setShowWarning] = useState(false);
  const [warningMessage, setWarningMessage] = useState("");
  const [submissionError, setSubmissionError] = useState(null);
  // Add state for html2pdf library
  const [html2pdfLib, setHtml2pdfLib] = useState(null);

  const pdfRef = useRef(null);
  const router = useRouter();
  const timerRef = useRef(null);

  // Test questions from the PDF
  const testQuestions = [
    {
      id: 1,
      question: "What is Terminal and why to use Terminal commands",
      type: "longText",
    },
    {
      id: 2,
      question:
        "You are inside a folder and want to list only the visible files and folders, not the hidden ones. Write the exact command you'd type.",
      type: "shortText",
    },
    {
      id: 3,
      question:
        "You've navigated deep into some unknown folders. Without using ls, how will you confirm your current location? Write the command.",
      type: "shortText",
    },
    {
      id: 4,
      question:
        "You are currently in /home/user/Documents/Work/2025. Without using an absolute path, how will you go back two levels and then into a folder called Personal? Write the command.",
      type: "shortText",
    },
    {
      id: 5,
      question:
        "You want to create a new folder named after today's date (e.g., 2025-05-17) inside your current directory. Write the command you would use.",
      type: "shortText",
    },
    {
      id: 6,
      question:
        "You mistakenly created a file instead of a folder. The file is named test. Now you want to delete only the file, making sure it's not a folder. Write your steps and command.",
      type: "longText",
    },
    {
      id: 7,
      question:
        "You're inside a directory. You want to create a new empty file named notes.txt, but only if that file doesn't already exist. How would you check and then create it?",
      type: "longText",
    },
    {
      id: 8,
      question:
        "You want to open your current directory in Visual Studio Code, but aren't sure if the command will work on your machine. What command would you try, and how would you verify if it succeeded?",
      type: "longText",
    },
    {
      id: 9,
      question:
        "You want to make a folder called projects, then immediately go inside it using only two commands. Write the two commands.",
      type: "shortText",
    },
    {
      id: 10,
      question:
        "You want to delete a folder named drafts, but only if it's empty. What command would you use, and how would you avoid deleting other contents by mistake?",
      type: "longText",
    },
    {
      id: 11,
      question:
        "You are confused whether you're in the right terminal tab or not. You want to clear the entire terminal view so you can start fresh and check the prompt. Write the command you'd use.",
      type: "shortText",
    },
  ];

  // Load html2pdf library on client-side only
  useEffect(() => {
    // Only import html2pdf in the browser
    if (typeof window !== 'undefined') {
      import('html2pdf.js')
        .then((module) => {
          setHtml2pdfLib(() => module.default);
        })
        .catch(error => {
          console.error("Failed to load html2pdf:", error);
        });
    }
  }, []);

  useEffect(() => {
    const initialAnswers = {};
    testQuestions.forEach((q) => {
      initialAnswers[q.id] = "";
    });
    setAnswers(initialAnswers);
  }, []);

  useEffect(() => {
    if (testStarted && startTime) {
      // Set up timer
      timerRef.current = setInterval(() => {
        setRemainingTime((prev) => {
          if (prev <= 1) {
            clearInterval(timerRef.current);
            handleSubmit("Time expired");
            return 0;
          }
          return prev - 1;
        });
      }, 1000);

      // Anti-cheating measures
      window.addEventListener("beforeunload", handleBeforeUnload);
      document.addEventListener("visibilitychange", handleVisibilityChange);
      document.addEventListener("copy", blockAction);
      document.addEventListener("cut", blockAction);
      document.addEventListener("paste", blockAction);
      document.addEventListener("contextmenu", blockAction);
      document.addEventListener("keydown", disableKeyCombos);
      window.addEventListener("focus", handleFocus);
      window.addEventListener("blur", handleBlur);
    }

    return () => {
      clearInterval(timerRef.current);
      window.removeEventListener("beforeunload", handleBeforeUnload);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      document.removeEventListener("copy", blockAction);
      document.removeEventListener("cut", blockAction);
      document.removeEventListener("paste", blockAction);
      document.removeEventListener("contextmenu", blockAction);
      document.removeEventListener("keydown", disableKeyCombos);
      window.removeEventListener("focus", handleFocus);
      window.removeEventListener("blur", handleBlur);
    };
  }, [testStarted, startTime]);

  // Format time display
  const formatTime = (seconds) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${hours.toString().padStart(2, "0")}:${minutes
      .toString()
      .padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  // Start the test
  const startTest = () => {
    // Validate student information
    if (
      !studentInfo.name.trim() ||
      !studentInfo.email.trim() 
    ) {
      setWarningMessage("Please fill in all the fields to start the test");
      setShowWarning(true);
      return;
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(studentInfo.email)) {
      setWarningMessage("Please enter a valid email address");
      setShowWarning(true);
      return;
    }

    // Start the test
    const now = Date.now();
    setStartTime(now);
    setTestStarted(true);
    trackEvent("test_started");
  };

  // Visibility change handler
  const handleVisibilityChange = () => {
    if (document.hidden) {
      setIsVisible(false);
      setSwitchCount((prev) => prev + 1);
      showTemporaryWarning(
        "Tab switching detected! This activity is being recorded."
      );
      trackEvent("tab_switched");
    } else {
      setIsVisible(true);
    }
  };

  // Handle beforeunload event
  const handleBeforeUnload = (e) => {
    if (!submitted) {
      const message = "You will lose all your progress if you leave now!";
      e.returnValue = message;
      trackEvent("attempted_exit");
      return message;
    }
  };

  // Track focus and blur events
  const handleFocus = () => {
    setFocusEvents((prev) => [
      ...prev,
      { type: "focus", time: new Date().toISOString() },
    ]);
  };

  const handleBlur = () => {
    setFocusEvents((prev) => [
      ...prev,
      { type: "blur", time: new Date().toISOString() },
    ]);
    showTemporaryWarning("Window focus lost! This activity is being recorded.");
    trackEvent("lost_focus");
  };

  // Block copy, cut, paste, right-click
  const blockAction = (e) => {
    e.preventDefault();
    showTemporaryWarning(
      `${
        e.type.charAt(0).toUpperCase() + e.type.slice(1)
      } action blocked! This attempt is being recorded.`
    );
    trackEvent(`attempted_${e.type}`);
    return false;
  };

  // Disable key combinations like Ctrl+C, Ctrl+V, etc.
  const disableKeyCombos = (e) => {
    // Block common shortcuts
    if (
      (e.ctrlKey || e.metaKey) &&
      ["c", "x", "v", "u", "p"].includes(e.key.toLowerCase())
    ) {
      e.preventDefault();
      showTemporaryWarning(
        `Keyboard shortcut (${
          e.ctrlKey ? "Ctrl" : "Cmd"
        }+${e.key.toUpperCase()}) blocked! This attempt is being recorded.`
      );
      trackEvent("keyboard_shortcut_blocked");
      return false;
    }

    // Block F12, Ctrl+Shift+I (Developer Tools)
    if (
      e.key === "F12" ||
      ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key.toLowerCase() === "i")
    ) {
      e.preventDefault();
      showTemporaryWarning(
        "Developer tools shortcut blocked! This attempt is being recorded."
      );
      trackEvent("devtools_access_attempted");
      return false;
    }
  };

  // Show temporary warning message
  const showTemporaryWarning = (message) => {
    setWarningMessage(message);
    setShowWarning(true);
    setTimeout(() => {
      setShowWarning(false);
    }, 3000);
  };

  // Track events for analytics
  const trackEvent = (eventType, details = {}) => {
    const eventData = {
      studentName: studentInfo.name,
      studentEmail: studentInfo.email,
      eventType,
      timestamp: new Date().toISOString(),
      ...details,
    };

    console.log("Event tracked:", eventData);

    // You could send this to your analytics backend
    // fetch('/api/track-event', {
    //   method: 'POST',
    //   headers: { 'Content-Type': 'application/json' },
    //   body: JSON.stringify(eventData)
    // });
  };

  // Handle answer change
  const handleAnswerChange = (questionId, value) => {
    setAnswers((prev) => ({
      ...prev,
      [questionId]: value,
    }));

    // Track significant typing events (not on every keystroke to avoid too many events)
    if (value.length % 50 === 0 && value.length > 0) {
      trackEvent("answer_progress", {
        questionId,
        characterCount: value.length,
      });
    }
  };

  // Generate PDF of answers
  const generatePDF = () => {
    if (!html2pdfLib) {
      console.error("html2pdf library not loaded");
      return Promise.reject(new Error("PDF library not loaded"));
    }

    const element = pdfRef.current;
    const opt = {
      margin: 10,
      filename: `${studentInfo.name.replace(/\s+/g, "_")}_test_answers.pdf`,
      image: { type: "jpeg", quality: 0.98 },
      html2canvas: { scale: 2 },
      jsPDF: { unit: "mm", format: "a4", orientation: "portrait" },
    };

    return html2pdfLib().set(opt).from(element).save();
  };

  // Submit the test
  const handleSubmit = async (reason = "Completed test") => {
    if (submitted) return;

    const endTime = Date.now();
    const duration = startTime ? Math.round((endTime - startTime) / 1000) : 0;

    // Count questions answered
    const answeredQuestions = Object.values(answers).filter(
      (answer) => answer.trim().length > 0
    ).length;

    // Prepare the analytics data in a format compatible with SheetBest
    // Making sure to use keys that match the column headers in the Google Sheet exactly
    const analyticsPayload = {
      "Student Name": studentInfo.name,
      "Email": studentInfo.email,
      "Tab Switch Count": switchCount,
      "Duration (seconds)": duration,
      "Active Tab": isVisible ? "Yes" : "No",
      "Submission Reason": reason,
      "Timestamp": new Date().toISOString(),
      "Questions Answered": answeredQuestions,
      "Total Questions": testQuestions.length,
      // Convert focus events to a string to store in a single cell
      "Focus Events": JSON.stringify(focusEvents)
    };

    setSubmitted(true);
    clearInterval(timerRef.current);

    console.log("Submitting analytics:", analyticsPayload);

    try {
      // Check if PDF library is loaded
      if (!html2pdfLib) {
        throw new Error("PDF generation library not loaded");
      }
      
      // Generate PDF first
      await generatePDF();

      // Submit analytics data to SheetBest API
      const response = await fetch(
        "https://api.sheetbest.com/sheets/e9459ea5-6465-408c-9cb9-026324277635",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(analyticsPayload),
        }
      );
      
      // Handle the response
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(`API Error: ${errorData.message || response.statusText}`);
      }

      trackEvent("test_submitted", { reason });
    } catch (error) {
      console.error("Error during submission:", error);
      setSubmissionError(error.message);
      // Continue showing PDF even if API submission fails
    }
  };

  // Check if time is almost up
  const isTimeAlmostUp = remainingTime <= 300; // 5 minutes or less

  // Student information form
  if (!testStarted) {
    return (
      <div className="max-w-md mx-auto mt-10 p-6 bg-white rounded-lg shadow-lg">
        <h1 className="text-2xl font-bold mb-6 text-center">
          Terminal Commands Test
        </h1>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Full Name
            </label>
            <input
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              type="text"
              value={studentInfo.name}
              onChange={(e) =>
                setStudentInfo({ ...studentInfo, name: e.target.value })
              }
              placeholder="Enter your full name"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Email Address
            </label>
            <input
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              type="email"
              value={studentInfo.email}
              onChange={(e) =>
                setStudentInfo({ ...studentInfo, email: e.target.value })
              }
              placeholder="Enter your email address"
            />
          </div>
        </div>

        {showWarning && (
          <div className="mt-4 p-2 bg-red-100 text-red-700 rounded">
            {warningMessage}
          </div>
        )}

        <div className="mt-6">
          <button
            className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 transition"
            onClick={startTest}
          >
            Start Test
          </button>
        </div>

        <div className="mt-4 text-sm text-gray-600">
          <p>⚠️ Important Instructions:</p>
          <ul className="list-disc pl-5 mt-2 space-y-1">
            <li>Test duration is 2 hours (1:30PM to 3:30PM)</li>
            <li>Submit your answers as PDF before 3:40PM</li>
            <li>No copy-pasting or tab switching allowed</li>
            <li>Cheating attempts will be recorded and reported</li>
          </ul>
        </div>
      </div>
    );
  }

  // Test submission page
  if (submitted) {
    return (
      <div className="max-w-md mx-auto mt-10 p-6 bg-white rounded-lg shadow-lg text-center">
        <h1 className="text-2xl font-bold mb-4">Test Submitted!</h1>
        <p className="mb-4">
          Thank you, {studentInfo.name}. Your answers have been recorded.
        </p>
        <p className="text-sm text-gray-600 mb-6">
          A PDF copy of your answers has been downloaded to your device.
        </p>
        
        {submissionError && (
          <div className="p-3 bg-yellow-100 text-yellow-800 rounded mb-4">
            <p>Note: There was an issue with the online submission: {submissionError}</p>
            <p>But don't worry, your PDF has been generated successfully!</p>
          </div>
        )}

        <button
          className="bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 transition"
          onClick={() => router.push("/")}
        >
          Return to Homepage
        </button>
      </div>
    );
  }

  // Test page
  return (
    <div className="max-w-4xl mx-auto p-6 select-none">
      {/* Header with timer and warning */}
      <div
        className={`fixed top-0 left-0 right-0 ${
          isTimeAlmostUp ? "bg-red-600" : "bg-blue-600"
        } text-white p-3 flex justify-between z-10`}
      >
        <div className="font-bold">
          {studentInfo.name}
        </div>
        <div className={`font-mono ${isTimeAlmostUp ? "animate-pulse" : ""}`}>
          Time Remaining: {formatTime(remainingTime)}
        </div>
      </div>

      {/* Warning banner */}
      {showWarning && (
        <div className="fixed top-12 left-0 right-0 bg-red-500 text-white p-2 text-center z-20 animate-pulse">
          {warningMessage}
        </div>
      )}

      <div className="mt-16 mb-8">
        <h1 className="text-2xl font-bold">Terminal Commands Test</h1>
        <p className="text-red-600 mt-2">
          ⚠️ Copying, pasting, switching tabs, and right-clicking are disabled
          and monitored.
        </p>
      </div>

      {/* Questions and Answers */}
      <div className="space-y-8 mb-16">
        {testQuestions.map((question) => (
          <div key={question.id} className="border p-4 rounded-lg">
            <p className="font-medium mb-2">
              {question.id}. {question.question}
            </p>
            <textarea
              className="w-full p-2 border border-gray-300 rounded-md min-h-20"
              value={answers[question.id] || ""}
              onChange={(e) => handleAnswerChange(question.id, e.target.value)}
              rows={question.type === "longText" ? 5 : 2}
              placeholder="Type your answer here..."
            />
          </div>
        ))}
      </div>

      {/* PDF Content (hidden) */}
      <div className="hidden">
        <div ref={pdfRef}>
          <div className="p-4">
            <h1 className="text-2xl font-bold mb-4">
              Terminal Commands Test - Answers
            </h1>
            <div className="mb-4">
              <p>
                <strong>Name:</strong> {studentInfo.name}
              </p>
              <p>
                <strong>Email:</strong> {studentInfo.email}
              </p>
              <p>
                <strong>Date:</strong> {new Date().toLocaleDateString()}
              </p>
              <p>
                <strong>Test Duration:</strong>{" "}
                {formatTime(7200 - remainingTime)}
              </p>
            </div>

            {testQuestions.map((question) => (
              <div key={question.id} className="mb-6">
                <p className="font-bold mb-1">
                  {question.id}. {question.question}
                </p>
                <div className="border p-2">
                  <p>{answers[question.id] || "No answer provided"}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Submit button */}
      <div className="fixed bottom-0 left-0 right-0 bg-white p-4 border-t shadow-lg">
        <button
          className="w-full bg-green-600 text-white py-3 px-4 rounded-md hover:bg-green-700 transition text-lg font-medium"
          onClick={() => handleSubmit()}
          disabled={!html2pdfLib}
        >
          {html2pdfLib ? "Submit Test and Generate PDF" : "Loading PDF Generator..."}
        </button>
      </div>
    </div>
  );
}