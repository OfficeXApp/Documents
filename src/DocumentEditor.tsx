import React, { useEffect, useState, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { v4 as uuidv4 } from "uuid";
import ReactQuill from "react-quill";
import "react-quill/dist/quill.snow.css";
import debounce from "lodash/debounce";
import {
  Layout,
  Input,
  Button,
  Modal,
  List,
  Space,
  message,
  Popconfirm,
  Dropdown,
  Alert,
} from "antd";
import {
  DownloadOutlined,
  FolderOpenOutlined,
  DeleteOutlined,
  MoreOutlined,
  FileAddOutlined,
  SaveOutlined,
} from "@ant-design/icons";

// Import the logo
import logo from "./logo192.png";
import Marquee from "react-fast-marquee";

const { Content } = Layout;

interface Document {
  docId: string;
  title: string;
  body: string;
}

const customStyles = `
  .ql-toolbar.ql-snow {
    border: none !important;
    border-bottom: 1px solid #e5e7eb !important;
    padding: 12px 16px !important;
    background: #f9fafb;
  }
  
  .ql-container.ql-snow {
    border: none !important;
  }
  
  .ql-editor {
    padding: 16px !important;
    font-size: 16px !important;
  }

  .save-indicator {
    opacity: 0;
    transition: opacity 0.3s ease-in-out;
  }

  .save-indicator.visible {
    opacity: 1;
  }

  @media (max-width: 640px) {
    .header-container {
      padding: 4px 8px !important;
    }
    
    .document-title-input {
      max-width: 200px !important;
    }
  }
`;

const DocumentEditor: React.FC = () => {
  const { docId } = useParams<{ docId: string }>();
  const navigate = useNavigate();
  const [document, setDocument] = useState<Document>({
    docId: docId || uuidv4(),
    title: "Untitled Document",
    body: "",
  });
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [documents, setDocuments] = useState<Document[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [showSaveIndicator, setShowSaveIndicator] = useState(false);
  const [saveTimeout, setSaveTimeout] = useState<NodeJS.Timeout | null>(null);

  // IndexDB setup
  const initIndexDB = async () => {
    const db = await window.indexedDB.open("OfficeXDocs", 1);

    db.onerror = () => {
      message.error("Failed to initialize database");
    };

    db.onupgradeneeded = (event: any) => {
      const db = event.target.result;
      if (!db.objectStoreNames.contains("documents")) {
        db.createObjectStore("documents", { keyPath: "docId" });
      }
    };
  };

  // Load document from IndexDB
  const loadDocument = async (id: string) => {
    const db = await window.indexedDB.open("OfficeXDocs", 1);
    db.onsuccess = (event: any) => {
      const db = event.target.result;
      const transaction = db.transaction(["documents"], "readonly");
      const store = transaction.objectStore("documents");
      const request = store.get(id);

      request.onsuccess = () => {
        if (request.result) {
          setDocument(request.result);
        } else {
          setDocument({
            docId: id,
            title: "Untitled Document",
            body: "",
          });
        }
      };
    };
  };

  // Save document to IndexDB
  const saveDocument = useCallback(
    debounce(async (doc: Document) => {
      const db = await window.indexedDB.open("OfficeXDocs", 1);
      db.onsuccess = (event: any) => {
        const db = event.target.result;
        const transaction = db.transaction(["documents"], "readwrite");
        const store = transaction.objectStore("documents");
        store.put(doc);

        // Clear any existing timeout
        if (saveTimeout) {
          clearTimeout(saveTimeout);
        }

        // Show the indicator
        setShowSaveIndicator(true);

        // Set new timeout to hide the indicator
        const timeout = setTimeout(() => {
          setShowSaveIndicator(false);
        }, 2000);

        setSaveTimeout(timeout);
      };
    }, 1000),
    [saveTimeout]
  );

  // Clean up timeout on unmount
  useEffect(() => {
    return () => {
      if (saveTimeout) {
        clearTimeout(saveTimeout);
      }
    };
  }, [saveTimeout]);

  // Manual save function
  const handleManualSave = async () => {
    await saveDocument(document);
    message.success("Document saved successfully");
  };

  // Delete document
  const deleteDocument = async (docId: string) => {
    const db = await window.indexedDB.open("OfficeXDocs", 1);
    db.onsuccess = (event: any) => {
      const db = event.target.result;
      const transaction = db.transaction(["documents"], "readwrite");
      const store = transaction.objectStore("documents");
      store.delete(docId);

      loadAllDocuments();
      navigate(`/doc/${uuidv4()}`);
      setIsModalOpen(false);
      message.success("Document deleted");
    };
  };

  // Load all documents for modal
  const loadAllDocuments = async () => {
    const db = await window.indexedDB.open("OfficeXDocs", 1);
    db.onsuccess = (event: any) => {
      const db = event.target.result;
      const transaction = db.transaction(["documents"], "readonly");
      const store = transaction.objectStore("documents");
      const request = store.getAll();

      request.onsuccess = () => {
        setDocuments(request.result);
      };
    };
  };

  // Download markdown file
  const downloadMarkdown = () => {
    const element = window.document.createElement("a");
    const file = new Blob([document.body], { type: "text/markdown" });
    element.href = URL.createObjectURL(file);
    element.download = `${document.title || "Untitled"}.md`;
    window.document.body.appendChild(element);
    element.click();
    window.document.body.removeChild(element);
  };

  useEffect(() => {
    initIndexDB();
  }, []);

  useEffect(() => {
    if (docId) {
      loadDocument(docId);
    }
  }, [docId]);

  useEffect(() => {
    if (document.docId && document.title && document.body) {
      saveDocument(document);
    }
  }, [document, saveDocument]);

  const filteredDocuments = documents.filter((doc) =>
    doc.title.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const actionItems = [
    {
      key: "new",
      icon: <FileAddOutlined />,
      label: "New",
      onClick: () => navigate("/"),
    },
    {
      key: "open",
      icon: <FolderOpenOutlined />,
      label: "Open",
      onClick: () => {
        loadAllDocuments();
        setIsModalOpen(true);
      },
    },
    {
      key: "save",
      icon: <SaveOutlined />,
      label: "Save",
      onClick: handleManualSave,
    },
    {
      key: "download",
      icon: <DownloadOutlined />,
      label: "Download",
      onClick: downloadMarkdown,
    },
  ];

  return (
    <div>
      <Layout className="min-h-screen">
        <style>{customStyles}</style>

        <div
          style={{
            display: "flex",
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
            width: "100%",
            padding: "5px",
          }}
        >
          <div
            style={{
              display: "flex",
              flexDirection: "row",
              alignItems: "center",
              gap: "10px",
            }}
          >
            <a
              href="https://drive.officex.app"
              target="_blank"
              rel="noreferrer"
            >
              <img
                src={logo}
                alt="OfficeX Logo"
                style={{ width: "30px", height: "30px" }}
              />
            </a>
            <Input
              placeholder="Untitled Document"
              value={document.title}
              onChange={(e) =>
                setDocument({ ...document, title: e.target.value })
              }
              className="document-title-input text-lg font-medium bg-transparent"
              bordered
              style={{ width: "300px" }}
            />
          </div>

          <div className="flex items-center gap-4">
            <span
              className={`save-indicator ${showSaveIndicator ? "visible" : ""}`}
              style={{ color: "gray", marginRight: "10px" }}
            >
              Saved...
            </span>
            <Dropdown
              menu={{ items: actionItems }}
              trigger={["click"]}
              placement="bottomRight"
            >
              <Button
                icon={<MoreOutlined />}
                className="flex items-center justify-center w-10 h-10 hover:bg-gray-100 rounded-full action-button"
              />
            </Dropdown>
          </div>
        </div>

        <Content className="flex-1">
          <ReactQuill
            theme="snow"
            value={document.body}
            onChange={(value) => setDocument({ ...document, body: value })}
            placeholder="OfficeX Documents is anonymous text editor. It is currently in alpha preview with limited functionality."
            modules={{
              toolbar: [
                [{ header: [1, 2, 3, false] }],
                ["bold", "italic", "underline", "strike"],
                [{ list: "ordered" }, { list: "bullet" }],
                ["link"],
                ["clean"],
              ],
            }}
            className="h-full"
            style={{
              height: "calc(100vh - 120px)",
              backgroundColor: "white",
            }}
          />
        </Content>

        <Modal
          title="Open Document"
          open={isModalOpen}
          onCancel={() => setIsModalOpen(false)}
          footer={null}
          width={500}
          className="rounded-lg"
        >
          <Input.Search
            placeholder="Search documents..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="mb-4"
          />
          <List
            dataSource={filteredDocuments}
            renderItem={(item) => (
              <List.Item
                className="hover:bg-gray-50 rounded-md px-4 transition-colors duration-150"
                actions={[
                  <Popconfirm
                    title="Delete document?"
                    description="This action cannot be undone."
                    onConfirm={() => deleteDocument(item.docId)}
                    okText="Delete"
                    cancelText="Cancel"
                    okButtonProps={{ danger: true }}
                  >
                    <Button
                      type="text"
                      icon={<DeleteOutlined />}
                      danger
                      className="hover:bg-red-50"
                    />
                  </Popconfirm>,
                ]}
              >
                <List.Item.Meta
                  title={
                    <Button
                      type="text"
                      onClick={() => {
                        navigate(`/doc/${item.docId}`);
                        setIsModalOpen(false);
                      }}
                      className="text-left hover:bg-transparent hover:text-blue-500"
                    >
                      {item.title}
                    </Button>
                  }
                />
              </List.Item>
            )}
          />
        </Modal>
      </Layout>
    </div>
  );
};

export default DocumentEditor;
