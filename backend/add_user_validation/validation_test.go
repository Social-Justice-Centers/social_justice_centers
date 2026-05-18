package add_user_validation

import (
	"encoding/json"
	"errors"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/gin-gonic/gin"
	"my-backend/domain"
	"my-backend/models"
)

// --- Mocks ---

type MockRegistry struct {
	MockUserStore *MockUserStore
}

func (m *MockRegistry) Users() domain.UserStore  { return m.MockUserStore }
func (m *MockRegistry) Shifts() domain.ShiftStore { return nil }

// MockUserStore implements domain.UserStore using an in-memory map keyed by phone.
type MockUserStore struct {
	users map[string]*models.User
}

func (m *MockUserStore) ExistsByPhone(phone string) (bool, error) {
	_, exists := m.users[phone]
	return exists, nil
}

func (m *MockUserStore) GetByPhone(phone string) (*models.User, error) {
	if user, exists := m.users[phone]; exists {
		return user, nil
	}
	return nil, errors.New("user not found")
}

// Unused by validation, required to satisfy the interface
func (m *MockUserStore) Create(user *models.User) error                           { return nil }
func (m *MockUserStore) GetAll() ([]models.User, error)                           { return nil, nil }
func (m *MockUserStore) GetByDirectManager(p string) ([]models.User, error)       { return nil, nil }

// --- Tests ---

func TestAddUserValidation(t *testing.T) {
	gin.SetMode(gin.TestMode)

	tests := []struct {
		name           string
		inputUser      *models.User
		existingUsers  map[string]*models.User
		expectedResult bool
		expectedCode   int
		expectedBody   string
	}{
		{
			name: "Success - Valid New User",
			inputUser: &models.User{
				FullName: "יואב פוקס",
				Username: "יואב פוקס",
				Password: "secret123",
				Phone:    "0501234567",
				Role:     models.RoleEmployee,
			},
			existingUsers:  map[string]*models.User{},
			expectedResult: true,
			expectedCode:   200,
			expectedBody:   "",
		},
		{
			name: "Failure - Empty Display Name",
			inputUser: &models.User{
				FullName: "יואב פוקס",
				Username: "",
				Password: "secret123",
				Phone:    "0501234567",
				Role:     models.RoleEmployee,
			},
			existingUsers:  map[string]*models.User{},
			expectedResult: false,
			expectedCode:   http.StatusBadRequest,
			expectedBody:   "שם המשתמש לא יכול להיות ריק",
		},
		{
			name: "Failure - Empty Password",
			inputUser: &models.User{
				FullName: "יואב פוקס",
				Username: "יואב פוקס",
				Password: "",
				Phone:    "0501234567",
				Role:     models.RoleEmployee,
			},
			existingUsers:  map[string]*models.User{},
			expectedResult: false,
			expectedCode:   http.StatusBadRequest,
			expectedBody:   "סיסמה לא יכולה להיות ריקה",
		},
		{
			name: "Failure - Phone Contains Letters",
			inputUser: &models.User{
				FullName: "יואב פוקס",
				Username: "יואב פוקס",
				Password: "secret123",
				Phone:    "05012abcde",
				Role:     models.RoleEmployee,
			},
			existingUsers:  map[string]*models.User{},
			expectedResult: false,
			expectedCode:   http.StatusBadRequest,
			expectedBody:   "על מספר טלפון להכיל ספרות בלבד",
		},
		{
			name: "Failure - Phone Too Short",
			inputUser: &models.User{
				FullName: "יואב פוקס",
				Username: "יואב פוקס",
				Password: "secret123",
				Phone:    "050123",
				Role:     models.RoleEmployee,
			},
			existingUsers:  map[string]*models.User{},
			expectedResult: false,
			expectedCode:   http.StatusBadRequest,
			expectedBody:   "על מספר טלפון להכיל 10 ספרות בדיוק",
		},
		{
			name: "Failure - Invalid Role",
			inputUser: &models.User{
				FullName: "יואב פוקס",
				Username: "יואב פוקס",
				Password: "secret123",
				Phone:    "0501234567",
				Role:     "superuser",
			},
			existingUsers:  map[string]*models.User{},
			expectedResult: false,
			expectedCode:   http.StatusBadRequest,
			expectedBody:   "תפקיד לא חוקי — חייב להיות employee או manager",
		},
		{
			name: "Failure - Phone Already Exists",
			inputUser: &models.User{
				FullName: "יואב פוקס",
				Username: "משתמש חדש",
				Password: "secret123",
				Phone:    "0509999999",
				Role:     models.RoleEmployee,
			},
			existingUsers: map[string]*models.User{
				"0509999999": {Username: "משתמש קיים", Phone: "0509999999"},
			},
			expectedResult: false,
			expectedCode:   http.StatusConflict,
			expectedBody:   "משתמש עם מספר טלפון זה כבר קיים",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			mockStore := &MockRegistry{
				MockUserStore: &MockUserStore{users: tt.existingUsers},
			}

			w := httptest.NewRecorder()
			c, _ := gin.CreateTestContext(w)

			result := AddUserValidation(c, tt.inputUser, mockStore)

			if result != tt.expectedResult {
				t.Errorf("expected return %v, got %v", tt.expectedResult, result)
			}

			if !tt.expectedResult {
				if w.Code != tt.expectedCode {
					t.Errorf("expected status code %d, got %d", tt.expectedCode, w.Code)
				}
				var response map[string]string
				if err := json.Unmarshal(w.Body.Bytes(), &response); err != nil {
					t.Fatalf("failed to parse response JSON: %v", err)
				}
				if response["error"] != tt.expectedBody {
					t.Errorf("expected error '%s', got '%s'", tt.expectedBody, response["error"])
				}
			}
		})
	}
}