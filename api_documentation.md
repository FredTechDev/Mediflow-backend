# Mediflow API Documentation Summary

This document provides a high-level overview of the available endpoints in the Mediflow platform. For interactive testing, please import the [mediflow_postman_collection.json](file:///home/fred/Desktop/mediflow/mediflow_postman_collection.json) into Postman.

## Authentication
All protected routes require a Bearer Token in the `Authorization` header.

| Method | Endpoint | Description | Role Required |
| :--- | :--- | :--- | :--- |
| `POST` | `/auth/register` | Register a new system user | `admin`, `manager` |
| `POST` | `/auth/login` | Login and receive JWT | Public |
| `POST` | `/auth/logout` | End session and clear cookie | Any Auth |

---

## Clinical (Doctor & Patient)
| Method | Endpoint | Description | Role Required |
| :--- | :--- | :--- | :--- |
| `POST` | `/patients` | Register a new patient | `doctor`, `admin` |
| `GET` | `/patients` | List all patients at facility | `doctor`, `admin`, `pharmacist` |
| `POST` | `/prescriptions` | Issue a multi-item prescription | `doctor` |
| `GET` | `/prescriptions/my` | View prescriptions issued by me | `doctor` |
| `GET` | `/inventory/search` | Search for drug availability nearby | `doctor`, `admin` |

---

## Pharmacy & Inventory
| Method | Endpoint | Description | Role Required |
| :--- | :--- | :--- | :--- |
| `GET` | `/prescriptions` | View pending prescriptions | `pharmacist`, `admin` |
| `POST` | `/prescriptions/dispense`| Dispense drugs and reduce stock | `pharmacist` |
| `POST` | `/inventory/:id/update` | Manually update stock levels | `pharmacist`, `admin` |
| `GET` | `/inventory/:facId` | View full facility inventory | `pharmacist`, `admin`, `manager` |

---

## Supply Chain & Analytics
| Method | Endpoint | Description | Role Required |
| :--- | :--- | :--- | :--- |
| `GET` | `/predictions/summary` | Get national stockout risk report | `government`, `supply_officer` |
| `GET` | `/redistribution/match` | Find surplus/shortage pairs | `supply_officer`, `manager` |
| `POST` | `/redistribution/transfer`| Initiate a stock transfer | `supply_officer`, `manager` |

---

## Integrations (System)
| Method | Endpoint | Description | Role Required |
| :--- | :--- | :--- | :--- |
| `POST` | `/sms/incoming` | Webhook for incoming SMS data | System |
| `POST` | `/sms/simulate` | Demo tool to simulate SMS data | Public (Demo) |

---

> [!TIP]
> **Base URL**: The default base URL is `http://localhost:5000/api`. You can change this using the `{{base_url}}` variable in Postman.
