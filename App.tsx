import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Alert,
  Modal,
  StatusBar,
  Linking,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';

import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEY = '@wasel_delivery_data_v1';

const COLORS = {
  primary: '#16A34A',
  dark: '#14532D',
  background: '#F6F8F6',
  white: '#FFFFFF',
  text: '#17231B',
  muted: '#758078',
  border: '#E5EAE6',
  danger: '#DC2626',
  orange: '#F59E0B',
};

const EMPTY_DATA = {
  restaurants: [],
  foods: [],
  orders: [],
  cart: [],
  profile: {
    name: '',
    phone: '',
    address: '',
    whatsapp: '',
    deliveryFee: '10',
  },
};

export default function App() {
  const [data, setData] = useState(EMPTY_DATA);
  const [loaded, setLoaded] = useState(false);

  const [page, setPage] = useState('home');
  const [selectedRestaurant, setSelectedRestaurant] = useState(null);
  const [selectedFood, setSelectedFood] = useState(null);

  const [modal, setModal] = useState('');
  const [editingId, setEditingId] = useState(null);

  const [restaurantForm, setRestaurantForm] = useState({
    name: '',
    category: '',
    description: '',
  });

  const [foodForm, setFoodForm] = useState({
    name: '',
    price: '',
    restaurantId: '',
    description: '',
  });

  const [profileForm, setProfileForm] = useState(EMPTY_DATA.profile);

  const [checkoutForm, setCheckoutForm] = useState({
    name: '',
    phone: '',
    address: '',
    notes: '',
  });

  const [search, setSearch] = useState('');

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    if (loaded) {
      saveData();
    }
  }, [data, loaded]);

  async function loadData() {
    try {
      const saved = await AsyncStorage.getItem(STORAGE_KEY);

      if (saved) {
        const parsed = JSON.parse(saved);

        setData({
          ...EMPTY_DATA,
          ...parsed,
          profile: {
            ...EMPTY_DATA.profile,
            ...(parsed.profile || {}),
          },
          restaurants: parsed.restaurants || [],
          foods: parsed.foods || [],
          orders: parsed.orders || [],
          cart: parsed.cart || [],
        });

        setProfileForm({
          ...EMPTY_DATA.profile,
          ...(parsed.profile || {}),
        });
      }
    } catch (error) {
      Alert.alert('تنبيه', 'تعذر تحميل البيانات المحفوظة.');
    } finally {
      setLoaded(true);
    }
  }

  async function saveData() {
    try {
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    } catch (error) {
      console.log('Save error:', error);
    }
  }

  function updateData(key, value) {
    setData((previous) => ({
      ...previous,
      [key]: value,
    }));
  }

  function makeId() {
    return `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  }

  function money(value) {
    return `${Number(value || 0).toLocaleString('en-US')} ل.س`;
  }

  function goBack() {
    if (modal) {
      setModal('');
      return;
    }

    setPage('home');
    setSelectedRestaurant(null);
    setSelectedFood(null);
  }

  function openRestaurantForm(restaurant = null) {
    setEditingId(restaurant?.id || null);

    setRestaurantForm(
      restaurant
        ? {
            name: restaurant.name,
            category: restaurant.category || '',
            description: restaurant.description || '',
          }
        : {
            name: '',
            category: '',
            description: '',
          }
    );

    setModal('restaurant');
  }

  function saveRestaurant() {
    const name = restaurantForm.name.trim();

    if (!name) {
      Alert.alert('تنبيه', 'أدخل اسم المطعم.');
      return;
    }

    if (editingId) {
      updateData(
        'restaurants',
        data.restaurants.map((item) =>
          item.id === editingId
            ? { ...item, ...restaurantForm, name }
            : item
        )
      );
    } else {
      updateData('restaurants', [
        ...data.restaurants,
        {
          id: makeId(),
          ...restaurantForm,
          name,
        },
      ]);
    }

    setModal('');
  }

  function deleteRestaurant(id) {
    Alert.alert('حذف المطعم', 'هل تريد حذف المطعم وجميع وجباته؟', [
      { text: 'إلغاء', style: 'cancel' },
      {
        text: 'حذف',
        style: 'destructive',
        onPress: () => {
          updateData(
            'restaurants',
            data.restaurants.filter((item) => item.id !== id)
          );

          updateData(
            'foods',
            data.foods.filter((item) => item.restaurantId !== id)
          );

          updateData(
            'cart',
            data.cart.filter((item) => item.restaurantId !== id)
          );
        },
      },
    ]);
  }

  function openFoodForm(food = null, restaurantId = '') {
    setEditingId(food?.id || null);

    setFoodForm(
      food
        ? {
            name: food.name,
            price: String(food.price),
            restaurantId: food.restaurantId,
            description: food.description || '',
          }
        : {
            name: '',
            price: '',
            restaurantId:
              restaurantId || data.restaurants[0]?.id || '',
            description: '',
          }
    );

    setModal('food');
  }

  function saveFood() {
    const name = foodForm.name.trim();
    const price = Number(foodForm.price);

    if (!name || !foodForm.restaurantId) {
      Alert.alert('تنبيه', 'أدخل اسم الوجبة واختر المطعم.');
      return;
    }

    if (
      foodForm.price.trim() === '' ||
      !Number.isFinite(price) ||
      price <= 0
    ) {
      Alert.alert('تنبيه', 'أدخل سعراً صحيحاً للوجبة.');
      return;
    }

    const item = {
      ...foodForm,
      name,
      price,
      id: editingId || makeId(),
    };

    if (editingId) {
      updateData(
        'foods',
        data.foods.map((food) =>
          food.id === editingId ? item : food
        )
      );

      updateData(
        'cart',
        data.cart.map((cartItem) =>
          cartItem.foodId === editingId
            ? {
                ...cartItem,
                name: item.name,
                price: item.price,
              }
            : cartItem
        )
      );
    } else {
      updateData('foods', [...data.foods, item]);
    }

    setModal('');
  }

  function deleteFood(id) {
    Alert.alert('حذف الوجبة', 'هل تريد حذف هذه الوجبة؟', [
      { text: 'إلغاء', style: 'cancel' },
      {
        text: 'حذف',
        style: 'destructive',
        onPress: () => {
          updateData(
            'foods',
            data.foods.filter((item) => item.id !== id)
          );

          updateData(
            'cart',
            data.cart.filter((item) => item.foodId !== id)
          );
        },
      },
    ]);
  }

  function addToCart(food) {
    const existing = data.cart.find(
      (item) => item.foodId === food.id
    );

    if (
      data.cart.length > 0 &&
      !data.cart.some(
        (item) => item.restaurantId === food.restaurantId
      )
    ) {
      Alert.alert(
        'مطعم مختلف',
        'السلة مخصصة لمطعم واحد. أفرغ السلة أولاً لطلب الطعام من مطعم آخر.',
        [
          { text: 'إلغاء', style: 'cancel' },
          {
            text: 'إفراغ السلة',
            style: 'destructive',
            onPress: () => {
              updateData('cart', [
                {
                  foodId: food.id,
                  restaurantId: food.restaurantId,
                  name: food.name,
                  price: food.price,
                  quantity: 1,
                },
              ]);

              Alert.alert('تمت الإضافة', 'أضيفت الوجبة إلى السلة.');
            },
          },
        ]
      );

      return;
    }

    if (existing) {
      updateData(
        'cart',
        data.cart.map((item) =>
          item.foodId === food.id
            ? { ...item, quantity: item.quantity + 1 }
            : item
        )
      );
    } else {
      updateData('cart', [
        ...data.cart,
        {
          foodId: food.id,
          restaurantId: food.restaurantId,
          name: food.name,
          price: food.price,
          quantity: 1,
        },
      ]);
    }

    Alert.alert('تمت الإضافة', 'أضيفت الوجبة إلى سلة المشتريات.');
  }

  function changeQuantity(foodId, amount) {
    updateData(
      'cart',
      data.cart
        .map((item) =>
          item.foodId === foodId
            ? {
                ...item,
                quantity: item.quantity + amount,
              }
            : item
        )
        .filter((item) => item.quantity > 0)
    );
  }

  const subtotal = data.cart.reduce(
    (sum, item) => sum + item.price * item.quantity,
    0
  );

  const deliveryFee =
    data.cart.length > 0
      ? Math.max(0, Number(data.profile.deliveryFee) || 0)
      : 0;

  const total = subtotal + deliveryFee;

  function openCheckout() {
    if (data.cart.length === 0) {
      Alert.alert('السلة فارغة', 'أضف وجبة أولاً.');
      return;
    }

    setCheckoutForm({
      name: data.profile.name || '',
      phone: data.profile.phone || '',
      address: data.profile.address || '',
      notes: '',
    });

    setPage('checkout');
  }

  function saveProfile() {
    const fee = Number(profileForm.deliveryFee);

    if (
      profileForm.deliveryFee.trim() === '' ||
      !Number.isFinite(fee) ||
      fee < 0
    ) {
      Alert.alert('تنبيه', 'أدخل تكلفة توصيل صحيحة.');
      return;
    }

    const cleaned = {
      ...profileForm,
      whatsapp: profileForm.whatsapp.replace(/\D/g, ''),
      deliveryFee: String(fee),
    };

    setData((previous) => ({
      ...previous,
      profile: cleaned,
    }));

    setProfileForm(cleaned);
    setModal('');
    Alert.alert('تم الحفظ', 'تم حفظ إعدادات التطبيق على الجهاز.');
  }

  async function placeOrder() {
    const name = checkoutForm.name.trim();
    const phone = checkoutForm.phone.trim();
    const address = checkoutForm.address.trim();

    if (!name || !phone || !address) {
      Alert.alert(
        'بيانات ناقصة',
        'أدخل اسم العميل ورقم الهاتف وعنوان التوصيل.'
      );
      return;
    }

    if (data.cart.length === 0) {
      Alert.alert('تنبيه', 'السلة فارغة.');
      return;
    }

    const restaurant = data.restaurants.find(
      (item) => item.id === data.cart[0]?.restaurantId
    );

    if (!restaurant) {
      Alert.alert('تنبيه', 'المطعم غير موجود. تحقق من محتويات السلة.');
      return;
    }

    const order = {
      id: makeId(),
      orderNumber: `W${Date.now().toString().slice(-8)}`,
      createdAt: new Date().toISOString(),
      customer: { name, phone, address },
      notes: checkoutForm.notes.trim(),
      restaurantId: restaurant.id,
      restaurantName: restaurant.name,
      items: data.cart.map((item) => ({ ...item })),
      subtotal,
      deliveryFee,
      total,
      status: 'بانتظار الإرسال',
    };

    const nextProfile = {
      ...data.profile,
      name,
      phone,
      address,
    };

    setData((previous) => ({
      ...previous,
      profile: nextProfile,
      orders: [order, ...previous.orders],
      cart: [],
    }));

    setProfileForm(nextProfile);

    const lines = [
      'طلب جديد - تطبيق واصل',
      '----------------------',
      `رقم الطلب: ${order.orderNumber}`,
      `المطعم: ${restaurant.name}`,
      '',
      'الوجبات:',
      ...order.items.map(
        (item) =>
          `- ${item.name} × ${item.quantity} = ${money(
            item.price * item.quantity
          )}`
      ),
      '',
      `المجموع: ${money(order.subtotal)}`,
      `التوصيل: ${money(order.deliveryFee)}`,
      `الإجمالي: ${money(order.total)}`,
      '',
      `اسم العميل: ${name}`,
      `رقم الهاتف: ${phone}`,
      `العنوان: ${address}`,
      `ملاحظات: ${order.notes || 'لا توجد'}`,
    ];

    const message = lines.join('\n');

    const whatsapp = data.profile.whatsapp.replace(/\D/g, '');

    setPage('orders');

    if (whatsapp) {
      const url =
        `https://wa.me/${whatsapp}?text=` +
        encodeURIComponent(message);

      try {
        await Linking.openURL(url);
      } catch (error) {
        Alert.alert(
          'تعذر فتح واتساب',
          'حُفظ الطلب محلياً، لكن تعذر فتح رابط واتساب.'
        );
      }
    } else {
      Alert.alert(
        'تم حفظ الطلب محلياً',
        'لم يتم إرسال الطلب إلى المطعم. أضف رقم واتساب المطعم من الإعدادات، ثم أعد الطلب لإرساله.'
      );
    }
  }

  function openRestaurant(restaurant) {
    setSelectedRestaurant(restaurant);
    setPage('restaurant');
  }

  function renderHeader(title, showBack = false) {
    return (
      <View style={styles.header}>
        <View style={styles.headerSide}>
          {showBack ? (
            <TouchableOpacity onPress={goBack} style={styles.iconButton}>
              <Ionicons name="arrow-forward" size={23} color={COLORS.dark} />
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              onPress={() => setModal('settings')}
              style={styles.iconButton}
            >
              <Ionicons name="settings-outline" size={23} color={COLORS.dark} />
            </TouchableOpacity>
          )}
        </View>

        <Text style={styles.headerTitle}>{title}</Text>

        <TouchableOpacity
          style={styles.iconButton}
          onPress={() => setPage('cart')}
        >
          <Ionicons name="bag-handle-outline" size={23} color={COLORS.dark} />

          {data.cart.length > 0 && (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>
                {data.cart.reduce((sum, item) => sum + item.quantity, 0)}
              </Text>
            </View>
          )}
        </TouchableOpacity>
      </View>
    );
  }

  function renderHome() {
    const visibleRestaurants = data.restaurants.filter((restaurant) =>
      `${restaurant.name} ${restaurant.category || ''}`
        .toLowerCase()
        .includes(search.trim().toLowerCase())
    );

    return (
      <>
        {renderHeader('واصل')}

        <ScrollView
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.hero}>
            <Text style={styles.heroSmall}>أهلاً بك في واصل</Text>
            <Text style={styles.heroTitle}>
              طلبك المفضل،{'\n'}يصل إلى بابك
            </Text>
            <Text style={styles.heroDescription}>
              أضف مطاعمك ووجباتك وابدأ باستقبال الطلبات.
            </Text>

            <View style={styles.heroIcon}>
              <Ionicons name="bicycle" size={55} color={COLORS.white} />
            </View>
          </View>

          <View style={styles.searchBox}>
            <Ionicons name="search-outline" size={21} color={COLORS.muted} />
            <TextInput
              value={search}
              onChangeText={setSearch}
              placeholder="ابحث عن مطعم..."
              placeholderTextColor={COLORS.muted}
              style={styles.searchInput}
              textAlign="right"
            />
          </View>

          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>المطاعم</Text>
            <TouchableOpacity onPress={() => openRestaurantForm()}>
              <Text style={styles.linkText}>+ إضافة مطعم</Text>
            </TouchableOpacity>
          </View>

          {visibleRestaurants.length === 0 ? (
            <View style={styles.emptyBox}>
              <Ionicons name="restaurant-outline" size={45} color={COLORS.primary} />
              <Text style={styles.emptyTitle}>لا توجد مطاعم بعد</Text>
              <Text style={styles.emptyDescription}>
                أضف بيانات مطعمك الحقيقية لعرضها هنا.
              </Text>

              <TouchableOpacity
                style={styles.primaryButton}
                onPress={() => openRestaurantForm()}
              >
                <Text style={styles.primaryButtonText}>إضافة أول مطعم</Text>
              </TouchableOpacity>
            </View>
          ) : (
            visibleRestaurants.map((restaurant) => (
              <View key={restaurant.id} style={styles.restaurantCard}>
                <TouchableOpacity
                  style={styles.restaurantMain}
                  onPress={() => openRestaurant(restaurant)}
                >
                  <View style={styles.restaurantIcon}>
                    <Ionicons name="restaurant" size={30} color={COLORS.primary} />
                  </View>

                  <View style={styles.restaurantInfo}>
                    <Text style={styles.restaurantName}>
                      {restaurant.name}
                    </Text>
                    <Text style={styles.mutedText}>
                      {restaurant.category || 'مطعم'}
                    </Text>
                    {!!restaurant.description && (
                      <Text style={styles.descriptionText} numberOfLines={2}>
                        {restaurant.description}
                      </Text>
                    )}
                    <Text style={styles.linkText}>عرض قائمة الطعام ←</Text>
                  </View>
                </TouchableOpacity>

                <View style={styles.cardActions}>
                  <TouchableOpacity
                    onPress={() => openFoodForm(null, restaurant.id)}
                    style={styles.smallAction}
                  >
                    <Ionicons name="add-circle-outline" size={20} color={COLORS.primary} />
                    <Text style={styles.smallActionText}>وجبة</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    onPress={() => openRestaurantForm(restaurant)}
                    style={styles.smallAction}
                  >
                    <Ionicons name="create-outline" size={20} color={COLORS.muted} />
                    <Text style={styles.smallActionText}>تعديل</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    onPress={() => deleteRestaurant(restaurant.id)}
                    style={styles.smallAction}
                  >
                    <Ionicons name="trash-outline" size={20} color={COLORS.danger} />
                  </TouchableOpacity>
                </View>
              </View>
            ))
          )}

          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>إدارة التطبيق</Text>
          </View>

          <View style={styles.adminGrid}>
            <TouchableOpacity
              style={styles.adminCard}
              onPress={() => openFoodForm()}
            >
              <Ionicons name="fast-food-outline" size={28} color={COLORS.primary} />
              <Text style={styles.adminCardTitle}>إضافة وجبة</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.adminCard}
              onPress={() => setPage('orders')}
            >
              <Ionicons name="receipt-outline" size={28} color={COLORS.primary} />
              <Text style={styles.adminCardTitle}>الطلبات</Text>
              <Text style={styles.mutedText}>
                {data.orders.length} طلب
              </Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </>
    );
  }

  function renderRestaurant() {
    const foods = data.foods.filter(
      (food) => food.restaurantId === selectedRestaurant?.id
    );

    return (
      <>
        {renderHeader(selectedRestaurant?.name || 'المطعم', true)}

        <ScrollView contentContainerStyle={styles.content}>
          <View style={styles.restaurantBanner}>
            <Ionicons name="restaurant" size={48} color={COLORS.primary} />
            <Text style={styles.restaurantNameLarge}>
              {selectedRestaurant?.name}
            </Text>
            <Text style={styles.mutedText}>
              {selectedRestaurant?.category || 'قائمة الطعام'}
            </Text>
          </View>

          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>قائمة الطعام</Text>
            <TouchableOpacity
              onPress={() => openFoodForm(null, selectedRestaurant?.id)}
            >
              <Text style={styles.linkText}>+ إضافة وجبة</Text>
            </TouchableOpacity>
          </View>

          {foods.length === 0 ? (
            <View style={styles.emptyBox}>
              <Ionicons name="fast-food-outline" size={40} color={COLORS.primary} />
              <Text style={styles.emptyTitle}>قائمة الطعام فارغة</Text>
              <Text style={styles.emptyDescription}>
                أضف وجبات المطعم وأسعارها الحقيقية.
              </Text>
            </View>
          ) : (
            foods.map((food) => (
              <View key={food.id} style={styles.foodCard}>
                <View style={styles.foodIcon}>
                  <Ionicons name="fast-food" size={27} color={COLORS.primary} />
                </View>

                <View style={styles.foodInfo}>
                  <Text style={styles.foodName}>{food.name}</Text>

                  {!!food.description && (
                    <Text style={styles.descriptionText}>
                      {food.description}
                    </Text>
                  )}

                  <Text style={styles.priceText}>{money(food.price)}</Text>

                  <View style={styles.foodActions}>
                    <TouchableOpacity
                      style={styles.addButton}
                      onPress={() => addToCart(food)}
                    >
                      <Ionicons name="add" size={19} color={COLORS.white} />
                      <Text style={styles.addButtonText}>إضافة للسلة</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      onPress={() => openFoodForm(food)}
                      style={styles.iconButton}
                    >
                      <Ionicons name="create-outline" size={21} color={COLORS.muted} />
                    </TouchableOpacity>

                    <TouchableOpacity
                      onPress={() => deleteFood(food.id)}
                      style={styles.iconButton}
                    >
                      <Ionicons name="trash-outline" size={21} color={COLORS.danger} />
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
            ))
          )}
        </ScrollView>
      </>
    );
  }

  function renderCart() {
    return (
      <>
        {renderHeader('سلة المشتريات', true)}

        <ScrollView contentContainerStyle={styles.content}>
          {data.cart.length === 0 ? (
            <View style={styles.emptyBox}>
              <Ionicons name="bag-outline" size={48} color={COLORS.primary} />
              <Text style={styles.emptyTitle}>سلتك فارغة</Text>
              <Text style={styles.emptyDescription}>
                اختر مطعماً وأضف الوجبات التي تريدها.
              </Text>
              <TouchableOpacity
                style={styles.primaryButton}
                onPress={() => setPage('home')}
              >
                <Text style={styles.primaryButtonText}>تصفح المطاعم</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <>
              {data.cart.map((item) => (
                <View key={item.foodId} style={styles.cartCard}>
                  <View style={styles.foodIcon}>
                    <Ionicons name="fast-food-outline" size={26} color={COLORS.primary} />
                  </View>

                  <View style={styles.cartInfo}>
                    <Text style={styles.foodName}>{item.name}</Text>
                    <Text style={styles.priceText}>
                      {money(item.price * item.quantity)}
                    </Text>
                    <Text style={styles.mutedText}>
                      {money(item.price)} للقطعة
                    </Text>
                  </View>

                  <View style={styles.quantityControl}>
                    <TouchableOpacity
                      style={styles.quantityButton}
                      onPress={() => changeQuantity(item.foodId, 1)}
                    >
                      <Ionicons name="add" size={19} color={COLORS.dark} />
                    </TouchableOpacity>

                    <Text style={styles.quantityText}>{item.quantity}</Text>

                    <TouchableOpacity
                      style={styles.quantityButton}
                      onPress={() => changeQuantity(item.foodId, -1)}
                    >
                      <Ionicons name="remove" size={19} color={COLORS.dark} />
                    </TouchableOpacity>
                  </View>
                </View>
              ))}

              <View style={styles.summaryCard}>
                <SummaryRow label="قيمة الوجبات" value={money(subtotal)} />
                <SummaryRow label="التوصيل" value={money(deliveryFee)} />

                <View style={styles.divider} />

                <SummaryRow
                  label="الإجمالي"
                  value={money(total)}
                  bold
                />

                <TouchableOpacity
                  style={styles.primaryButton}
                  onPress={openCheckout}
                >
                  <Text style={styles.primaryButtonText}>
                    متابعة وإتمام الطلب
                  </Text>
                  <Ionicons name="arrow-back" size={19} color={COLORS.white} />
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.clearButton}
                  onPress={() => {
                    Alert.alert('إفراغ السلة', 'هل تريد حذف جميع الوجبات؟', [
                      { text: 'إلغاء', style: 'cancel' },
                      {
                        text: 'إفراغ',
                        style: 'destructive',
                        onPress: () => updateData('cart', []),
                      },
                    ]);
                  }}
                >
                  <Text style={styles.dangerText}>إفراغ السلة</Text>
                </TouchableOpacity>
              </View>
            </>
          )}
        </ScrollView>
      </>
    );
  }

  function renderCheckout() {
    return (
      <>
        {renderHeader('تأكيد الطلب', true)}

        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <ScrollView contentContainerStyle={styles.content}>
            <View style={styles.formCard}>
              <Text style={styles.sectionTitle}>بيانات التوصيل</Text>

              <FormField
                label="اسم العميل"
                icon="person-outline"
                value={checkoutForm.name}
                onChangeText={(value) =>
                  setCheckoutForm({ ...checkoutForm, name: value })
                }
                placeholder="الاسم الكامل"
              />

              <FormField
                label="رقم الهاتف"
                icon="call-outline"
                value={checkoutForm.phone}
                onChangeText={(value) =>
                  setCheckoutForm({ ...checkoutForm, phone: value })
                }
                placeholder="رقم هاتف العميل"
                keyboardType="phone-pad"
              />

              <FormField
                label="عنوان التوصيل"
                icon="location-outline"
                value={checkoutForm.address}
                onChangeText={(value) =>
                  setCheckoutForm({ ...checkoutForm, address: value })
                }
                placeholder="المدينة والشارع ورقم البناء"
              />

              <FormField
                label="ملاحظات الطلب (اختياري)"
                icon="chatbox-outline"
                value={checkoutForm.notes}
                onChangeText={(value) =>
                  setCheckoutForm({ ...checkoutForm, notes: value })
                }
                placeholder="أي تعليمات إضافية"
              />
            </View>

            <View style={styles.summaryCard}>
              <Text style={styles.sectionTitle}>ملخص الطلب</Text>
              <SummaryRow label="قيمة الوجبات" value={money(subtotal)} />
              <SummaryRow label="التوصيل" value={money(deliveryFee)} />
              <View style={styles.divider} />
              <SummaryRow label="الإجمالي" value={money(total)} bold />

              <TouchableOpacity
                style={styles.primaryButton}
                onPress={placeOrder}
              >
                <Ionicons name="logo-whatsapp" size={22} color={COLORS.white} />
                <Text style={styles.primaryButtonText}>
                  حفظ الطلب والمتابعة إلى واتساب
                </Text>
              </TouchableOpacity>

              <Text style={styles.hintText}>
                سيتم حفظ الطلب على هذا الجهاز. إذا أضفت رقم واتساب المطعم في الإعدادات، يمكنك فتح واتساب وإرسال تفاصيل الطلب إليه.
              </Text>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </>
    );
  }

  function renderOrders() {
    return (
      <>
        {renderHeader('الطلبات', true)}

        <ScrollView contentContainerStyle={styles.content}>
          {data.orders.length === 0 ? (
            <View style={styles.emptyBox}>
              <Ionicons name="receipt-outline" size={45} color={COLORS.primary} />
              <Text style={styles.emptyTitle}>لا توجد طلبات</Text>
              <Text style={styles.emptyDescription}>
                ستظهر هنا الطلبات التي تحفظها من هذا الجهاز.
              </Text>
            </View>
          ) : (
            data.orders.map((order) => (
              <View key={order.id} style={styles.orderCard}>
                <View style={styles.orderHeader}>
                  <View>
                    <Text style={styles.foodName}>
                      طلب #{order.orderNumber}
                    </Text>
                    <Text style={styles.mutedText}>
                      {new Date(order.createdAt).toLocaleString('ar')}
                    </Text>
                  </View>

                  <View style={styles.statusBadge}>
                    <Text style={styles.statusText}>{order.status}</Text>
                  </View>
                </View>

                <Text style={styles.orderRestaurant}>
                  {order.restaurantName}
                </Text>

                {order.items.map((item, index) => (
                  <Text key={`${order.id}_${index}`} style={styles.orderItem}>
                    {item.name} × {item.quantity} — {money(item.price * item.quantity)}
                  </Text>
                ))}

                <View style={styles.divider} />

                <Text style={styles.mutedText}>
                  العميل: {order.customer.name}
                </Text>

                <Text style={styles.mutedText}>
                  الهاتف: {order.customer.phone}
                </Text>

                <Text style={styles.mutedText}>
                  العنوان: {order.customer.address}
                </Text>

                <Text style={styles.orderTotal}>
                  الإجمالي: {money(order.total)}
                </Text>

                <TouchableOpacity
                  style={styles.clearButton}
                  onPress={() => {
                    Alert.alert('حذف الطلب', 'هل تريد حذف هذا الطلب من الجهاز؟', [
                      { text: 'إلغاء', style: 'cancel' },
                      {
                        text: 'حذف',
                        style: 'destructive',
                        onPress: () =>
                          updateData(
                            'orders',
                            data.orders.filter((item) => item.id !== order.id)
                          ),
                      },
                    ]);
                  }}
                >
                  <Text style={styles.dangerText}>حذف الطلب من الجهاز</Text>
                </TouchableOpacity>
              </View>
            ))
          )}
        </ScrollView>
      </>
    );
  }

  function renderModal() {
    return (
      <Modal
        visible={!!modal}
        animationType="slide"
        transparent
        onRequestClose={() => setModal('')}
      >
        <KeyboardAvoidingView
          style={styles.modalOverlay}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.sectionTitle}>
                {modal === 'restaurant'
                  ? editingId
                    ? 'تعديل المطعم'
                    : 'إضافة مطعم جديد'
                  : modal === 'food'
                    ? editingId
                      ? 'تعديل الوجبة'
                      : 'إضافة وجبة جديدة'
                    : 'إعدادات التطبيق'}
              </Text>

              <TouchableOpacity
                onPress={() => setModal('')}
                style={styles.iconButton}
              >
                <Ionicons name="close" size={25} color={COLORS.dark} />
              </TouchableOpacity>
            </View>

            <ScrollView
              keyboardShouldPersistTaps="handled"
              contentContainerStyle={{ paddingBottom: 20 }}
            >
              {modal === 'restaurant' && (
                <>
                  <FormField
                    label="اسم المطعم"
                    value={restaurantForm.name}
                    onChangeText={(value) =>
                      setRestaurantForm({ ...restaurantForm, name: value })
                    }
                    placeholder="اسم المطعم الحقيقي"
                  />

                  <FormField
                    label="التصنيف"
                    value={restaurantForm.category}
                    onChangeText={(value) =>
                      setRestaurantForm({ ...restaurantForm, category: value })
                    }
                    placeholder="مثلاً: وجبات سريعة"
                  />

                  <FormField
                    label="وصف المطعم"
                    value={restaurantForm.description}
                    onChangeText={(value) =>
                      setRestaurantForm({
                        ...restaurantForm,
                        description: value,
                      })
                    }
                    placeholder="معلومات عن المطعم"
                  />

                  <TouchableOpacity
                    style={styles.primaryButton}
                    onPress={saveRestaurant}
                  >
                    <Text style={styles.primaryButtonText}>حفظ المطعم</Text>
                  </TouchableOpacity>
                </>
              )}

              {modal === 'food' && (
                <>
                  <FormField
                    label="اسم الوجبة"
                    value={foodForm.name}
                    onChangeText={(value) =>
                      setFoodForm({ ...foodForm, name: value })
                    }
                    placeholder="اسم الوجبة"
                  />

                  <FormField
                    label="السعر بالليرة السورية"
                    value={foodForm.price}
                    onChangeText={(value) =>
                      setFoodForm({ ...foodForm, price: value })
                    }
                    placeholder="مثلاً: 25000"
                    keyboardType="decimal-pad"
                  />

                  <FormField
                    label="وصف الوجبة"
                    value={foodForm.description}
                    onChangeText={(value) =>
                      setFoodForm({ ...foodForm, description: value })
                    }
                    placeholder="مكونات أو تفاصيل الوجبة"
                  />

                  <Text style={styles.fieldLabel}>اختر المطعم</Text>

                  {data.restaurants.length === 0 ? (
                    <Text style={styles.hintText}>
                      أضف مطعماً أولاً حتى تتمكن من إضافة وجبة.
                    </Text>
                  ) : (
                    data.restaurants.map((restaurant) => (
                      <TouchableOpacity
                        key={restaurant.id}
                        onPress={() =>
                          setFoodForm({
                            ...foodForm,
                            restaurantId: restaurant.id,
                          })
                        }
                        style={[
                          styles.choiceButton,
                          foodForm.restaurantId === restaurant.id &&
                            styles.choiceButtonActive,
                        ]}
                      >
                        <Ionicons
                          name={
                            foodForm.restaurantId === restaurant.id
                              ? 'radio-button-on'
                              : 'radio-button-off'
                          }
                          size={20}
                          color={COLORS.primary}
                        />
                        <Text style={styles.choiceText}>{restaurant.name}</Text>
                      </TouchableOpacity>
                    ))
                  )}

                  <TouchableOpacity
                    style={styles.primaryButton}
                    onPress={saveFood}
                  >
                    <Text style={styles.primaryButtonText}>حفظ الوجبة</Text>
                  </TouchableOpacity>
                </>
              )}

              {modal === 'settings' && (
                <>
                  <Text style={styles.hintText}>
                    أدخل رقم واتساب المطعم مع رمز الدولة، بدون علامة + أو مسافات.
                    مثال: 9639XXXXXXXX.
                  </Text>

                  <FormField
                    label="رقم واتساب لاستقبال الطلبات"
                    value={profileForm.whatsapp}
                    onChangeText={(value) =>
                      setProfileForm({ ...profileForm, whatsapp: value })
                    }
                    placeholder="9639XXXXXXXX"
                    keyboardType="phone-pad"
                  />

                  <FormField
                    label="تكلفة التوصيل بالليرة السورية"
                    value={profileForm.deliveryFee}
                    onChangeText={(value) =>
                      setProfileForm({ ...profileForm, deliveryFee: value })
                    }
                    placeholder="0"
                    keyboardType="decimal-pad"
                  />

                  <FormField
                    label="اسم العميل الافتراضي"
                    value={profileForm.name}
                    onChangeText={(value) =>
                      setProfileForm({ ...profileForm, name: value })
                    }
                    placeholder="اسم العميل"
                  />

                  <FormField
                    label="رقم الهاتف الافتراضي"
                    value={profileForm.phone}
                    onChangeText={(value) =>
                      setProfileForm({ ...profileForm, phone: value })
                    }
                    placeholder="رقم الهاتف"
                    keyboardType="phone-pad"
                  />

                  <FormField
                    label="عنوان التوصيل الافتراضي"
                    value={profileForm.address}
                    onChangeText={(value) =>
                      setProfileForm({ ...profileForm, address: value })
                    }
                    placeholder="العنوان"
                  />

                  <TouchableOpacity
                    style={styles.primaryButton}
                    onPress={saveProfile}
                  >
                    <Text style={styles.primaryButtonText}>
                      حفظ الإعدادات
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.clearButton}
                    onPress={() => {
                      Alert.alert(
                        'حذف جميع البيانات',
                        'سيتم حذف المطاعم والوجبات والطلبات والسلة من هذا الجهاز. لا يمكن التراجع.',
                        [
                          { text: 'إلغاء', style: 'cancel' },
                          {
                            text: 'حذف الكل',
                            style: 'destructive',
                            onPress: async () => {
                              setData(EMPTY_DATA);
                              setProfileForm(EMPTY_DATA.profile);

                              await AsyncStorage.removeItem(STORAGE_KEY);

                              setModal('');
                              setPage('home');
                            },
                          },
                        ]
                      );
                    }}
                  >
                    <Text style={styles.dangerText}>حذف جميع البيانات المحلية</Text>
                  </TouchableOpacity>
                </>
              )}
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    );
  }

  if (!loaded) {
    return (
      <View style={styles.loading}>
        <StatusBar barStyle="dark-content" backgroundColor={COLORS.background} />
        <Ionicons name="bicycle" size={50} color={COLORS.primary} />
        <Text style={styles.loadingText}>جاري تحميل واصل...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar
        barStyle="dark-content"
        backgroundColor={COLORS.background}
      />

      {page === 'home' && renderHome()}
      {page === 'restaurant' && renderRestaurant()}
      {page === 'cart' && renderCart()}
      {page === 'checkout' && renderCheckout()}
      {page === 'orders' && renderOrders()}

      <View style={styles.bottomNav}>
        <NavItem
          icon="home-outline"
          label="الرئيسية"
          active={page === 'home' || page === 'restaurant'}
          onPress={() => setPage('home')}
        />

        <NavItem
          icon="bag-handle-outline"
          label="السلة"
          active={page === 'cart' || page === 'checkout'}
          onPress={() => setPage('cart')}
        />

        <NavItem
          icon="receipt-outline"
          label="الطلبات"
          active={page === 'orders'}
          onPress={() => setPage('orders')}
        />
      </View>

      {renderModal()}
    </View>
  );
}

function SummaryRow({ label, value, bold = false }) {
  return (
    <View style={styles.summaryRow}>
      <Text style={[styles.summaryLabel, bold && styles.summaryBold]}>
        {label}
      </Text>
      <Text style={[styles.summaryValue, bold && styles.summaryBold]}>
        {value}
      </Text>
    </View>
  );
}

function FormField({
  label,
  icon,
  value,
  onChangeText,
  placeholder,
  keyboardType = 'default',
}) {
  return (
    <View style={styles.fieldContainer}>
      <Text style={styles.fieldLabel}>{label}</Text>

      <View style={styles.inputWrapper}>
        {icon ? (
          <Ionicons
            name={icon}
            size={20}
            color={COLORS.muted}
            style={{ marginHorizontal: 10 }}
          />
        ) : null}

        <TextInput
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={COLORS.muted}
          keyboardType={keyboardType}
          style={styles.input}
          textAlign="right"
        />
      </View>
    </View>
  );
}

function NavItem({ icon, label, active, onPress }) {
  return (
    <TouchableOpacity onPress={onPress} style={styles.navItem}>
      <Ionicons
        name={icon}
        size={23}
        color={active ? COLORS.primary : COLORS.muted}
      />
      <Text
        style={[
          styles.navLabel,
          active && { color: COLORS.primary, fontWeight: 'bold' },
        ]}
      >
        {label}
      </Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },

  loading: {
    flex: 1,
    backgroundColor: COLORS.background,
    alignItems: 'center',
    justifyContent: 'center',
  },

  loadingText: {
    marginTop: 12,
    color: COLORS.dark,
    fontSize: 16,
  },

  header: {
    height: 62,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    backgroundColor: COLORS.white,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },

  headerSide: {
    width: 44,
    alignItems: 'flex-start',
  },

  headerTitle: {
    fontSize: 21,
    fontWeight: 'bold',
    color: COLORS.dark,
  },

  iconButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
  },

  badge: {
    position: 'absolute',
    top: 0,
    right: 0,
    minWidth: 17,
    height: 17,
    borderRadius: 10,
    backgroundColor: COLORS.danger,
    alignItems: 'center',
    justifyContent: 'center',
  },

  badgeText: {
    color: COLORS.white,
    fontSize: 10,
    fontWeight: 'bold',
  },

  content: {
    padding: 16,
    paddingBottom: 28,
  },

  hero: {
    minHeight: 185,
    backgroundColor: COLORS.dark,
    borderRadius: 23,
    padding: 22,
    overflow: 'hidden',
    marginBottom: 20,
  },

  heroSmall: {
    color: '#BBF7D0',
    fontSize: 14,
    marginBottom: 8,
    textAlign: 'right',
  },

  heroTitle: {
    color: COLORS.white,
    fontSize: 27,
    lineHeight: 38,
    fontWeight: 'bold',
    textAlign: 'right',
  },

  heroDescription: {
    color: '#DCFCE7',
    fontSize: 13,
    marginTop: 8,
    textAlign: 'right',
    maxWidth: '80%',
  },

  heroIcon: {
    position: 'absolute',
    left: 15,
    bottom: 20,
    opacity: 0.9,
  },

  searchBox: {
    height: 50,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.white,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingHorizontal: 12,
    marginBottom: 24,
  },

  searchInput: {
    flex: 1,
    color: COLORS.text,
    fontSize: 14,
    paddingHorizontal: 10,
  },

  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 13,
    marginTop: 8,
  },

  sectionTitle: {
    color: COLORS.dark,
    fontSize: 18,
    fontWeight: 'bold',
    textAlign: 'right',
  },

  linkText: {
    color: COLORS.primary,
    fontSize: 13,
    fontWeight: 'bold',
    textAlign: 'right',
  },

  restaurantCard: {
    backgroundColor: COLORS.white,
    borderRadius: 18,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
  },

  restaurantMain: {
    flexDirection: 'row-reverse',
    alignItems: 'flex-start',
  },

  restaurantIcon: {
    width: 64,
    height: 64,
    borderRadius: 16,
    backgroundColor: '#DCFCE7',
    alignItems: 'center',
    justifyContent: 'center',
  },

  restaurantInfo: {
    flex: 1,
    paddingRight: 12,
    alignItems: 'flex-end',
  },

  restaurantName: {
    fontSize: 17,
    color: COLORS.text,
    fontWeight: 'bold',
    marginBottom: 5,
    textAlign: 'right',
  },

  restaurantNameLarge: {
    fontSize: 23,
    color: COLORS.dark,
    fontWeight: 'bold',
    marginTop: 12,
  },

  mutedText: {
    fontSize: 12,
    color: COLORS.muted,
    lineHeight: 20,
    textAlign: 'right',
  },

  descriptionText: {
    fontSize: 12,
    color: COLORS.muted,
    lineHeight: 19,
    marginVertical: 5,
    textAlign: 'right',
  },

  cardActions: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    marginTop: 12,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },

  smallAction: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    paddingHorizontal: 9,
    paddingVertical: 5,
    marginLeft: 8,
  },

  smallActionText: {
    fontSize: 12,
    color: COLORS.muted,
    marginRight: 4,
  },

  adminGrid: {
    flexDirection: 'row-reverse',
    gap: 12,
  },

  adminCard: {
    flex: 1,
    backgroundColor: COLORS.white,
    borderRadius: 17,
    padding: 17,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
    gap: 8,
  },

  adminCardTitle: {
    color: COLORS.dark,
    fontSize: 14,
    fontWeight: 'bold',
  },

  emptyBox: {
    backgroundColor: COLORS.white,
    borderRadius: 20,
    padding: 28,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
    marginVertical: 12,
  },

  emptyTitle: {
    color: COLORS.dark,
    fontSize: 17,
    fontWeight: 'bold',
    marginTop: 13,
  },

  emptyDescription: {
    color: COLORS.muted,
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 22,
    marginTop: 7,
    marginBottom: 16,
  },

  primaryButton: {
    minHeight: 49,
    borderRadius: 13,
    backgroundColor: COLORS.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
    marginTop: 16,
    gap: 9,
  },

  primaryButtonText: {
    color: COLORS.white,
    fontSize: 14,
    fontWeight: 'bold',
    textAlign: 'center',
  },

  restaurantBanner: {
    alignItems: 'center',
    paddingVertical: 25,
    backgroundColor: COLORS.white,
    borderRadius: 20,
    marginBottom: 22,
    borderWidth: 1,
    borderColor: COLORS.border,
  },

  foodCard: {
    flexDirection: 'row-reverse',
    backgroundColor: COLORS.white,
    borderRadius: 17,
    padding: 13,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: 'flex-start',
  },

  foodIcon: {
    width: 54,
    height: 54,
    borderRadius: 15,
    backgroundColor: '#DCFCE7',
    alignItems: 'center',
    justifyContent: 'center',
  },

  foodInfo: {
    flex: 1,
    alignItems: 'flex-end',
    paddingRight: 12,
  },

  foodName: {
    fontSize: 15,
    fontWeight: 'bold',
    color: COLORS.text,
    textAlign: 'right',
  },

  priceText: {
    fontSize: 14,
    color: COLORS.primary,
    fontWeight: 'bold',
    marginTop: 5,
    textAlign: 'right',
  },

  foodActions: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    marginTop: 8,
    alignSelf: 'stretch',
  },

  addButton: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    backgroundColor: COLORS.primary,
    paddingHorizontal: 11,
    paddingVertical: 8,
    borderRadius: 10,
    gap: 3,
  },

  addButtonText: {
    color: COLORS.white,
    fontSize: 12,
    fontWeight: 'bold',
  },

  cartCard: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    backgroundColor: COLORS.white,
    borderRadius: 16,
    padding: 13,
    marginBottom: 11,
    borderWidth: 1,
    borderColor: COLORS.border,
  },

  cartInfo: {
    flex: 1,
    alignItems: 'flex-end',
    paddingHorizontal: 10,
  },

  quantityControl: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
  },

  quantityButton: {
    width: 31,
    height: 31,
    borderRadius: 10,
    backgroundColor: '#DCFCE7',
    alignItems: 'center',
    justifyContent: 'center',
  },

  quantityText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: COLORS.dark,
  },

  summaryCard: {
    backgroundColor: COLORS.white,
    borderRadius: 18,
    padding: 17,
    marginTop: 15,
    borderWidth: 1,
    borderColor: COLORS.border,
  },

  summaryRow: {
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 9,
  },

  summaryLabel: {
    color: COLORS.muted,
    fontSize: 13,
    textAlign: 'right',
  },

  summaryValue: {
    color: COLORS.text,
    fontSize: 13,
    fontWeight: '600',
  },

  summaryBold: {
    color: COLORS.dark,
    fontWeight: 'bold',
    fontSize: 16,
  },

  divider: {
    height: 1,
    backgroundColor: COLORS.border,
    marginVertical: 9,
  },

  clearButton: {
    paddingVertical: 13,
    alignItems: 'center',
  },

  dangerText: {
    color: COLORS.danger,
    fontSize: 13,
    fontWeight: 'bold',
  },

  formCard: {
    backgroundColor: COLORS.white,
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
  },

  fieldContainer: {
    marginTop: 15,
  },

  fieldLabel: {
    fontSize: 13,
    color: COLORS.dark,
    fontWeight: 'bold',
    textAlign: 'right',
    marginBottom: 8,
  },

  inputWrapper: {
    minHeight: 48,
    flexDirection: 'row-reverse',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 12,
    backgroundColor: '#FCFDFC',
    paddingHorizontal: 8,
  },

  input: {
    flex: 1,
    minHeight: 46,
    color: COLORS.text,
    fontSize: 14,
    paddingHorizontal: 8,
  },

  hintText: {
    fontSize: 12,
    color: COLORS.muted,
    lineHeight: 21,
    textAlign: 'right',
    marginTop: 10,
  },

  orderCard: {
    backgroundColor: COLORS.white,
    borderRadius: 17,
    padding: 15,
    marginBottom: 13,
    borderWidth: 1,
    borderColor: COLORS.border,
  },

  orderHeader: {
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    alignItems: 'center',
  },

  statusBadge: {
    backgroundColor: '#FEF3C7',
    borderRadius: 9,
    paddingHorizontal: 9,
    paddingVertical: 6,
  },

  statusText: {
    fontSize: 11,
    color: '#92400E',
    fontWeight: 'bold',
  },

  orderRestaurant: {
    color: COLORS.primary,
    fontWeight: 'bold',
    fontSize: 14,
    textAlign: 'right',
    marginTop: 14,
    marginBottom: 7,
  },

  orderItem: {
    fontSize: 12,
    color: COLORS.muted,
    textAlign: 'right',
    lineHeight: 22,
  },

  orderTotal: {
    color: COLORS.dark,
    fontSize: 16,
    fontWeight: 'bold',
    textAlign: 'right',
    marginTop: 13,
  },

  bottomNav: {
    minHeight: 65,
    flexDirection: 'row-reverse',
    backgroundColor: COLORS.white,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    justifyContent: 'space-around',
    alignItems: 'center',
    paddingBottom: Platform.OS === 'ios' ? 12 : 2,
  },

  navItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    gap: 4,
  },

  navLabel: {
    fontSize: 11,
    color: COLORS.muted,
  },

  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.38)',
    justifyContent: 'flex-end',
  },

  modalCard: {
    backgroundColor: COLORS.white,
    borderTopLeftRadius: 25,
    borderTopRightRadius: 25,
    paddingHorizontal: 20,
    paddingTop: 15,
    paddingBottom: 20,
    maxHeight: '88%',
  },

  modalHeader: {
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },

  choiceButton: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    padding: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 11,
    marginTop: 8,
    gap: 9,
  },

  choiceButtonActive: {
    borderColor: COLORS.primary,
    backgroundColor: '#F0FDF4',
  },

  choiceText: {
    color: COLORS.text,
    fontSize: 13,
    textAlign: 'right',
  },
});