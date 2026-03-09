import re

with open(r"C:\Users\neilm\Documents\Pawsley\src\pages\Profile.tsx", "r", encoding="utf-8") as f:
    content = f.read()

# 1. Add IonAccordion imports
content = content.replace("IonGrid,\n    IonCol", "IonGrid,\n    IonCol,\n    IonAccordion,\n    IonAccordionGroup")

# 2. Add AccordionGroup start and end
content = content.replace(
    """                {/* ── Page body ── */}
                <div className="acct-body">""",
    """                {/* ── Page body ── */}
                <div className="acct-body">
                    <IonAccordionGroup multiple={true}>"""
)

content = content.replace(
    """                    <div style={{ height: '32px' }} />
                </div>

                <IonToast""",
    """                    </IonAccordionGroup>
                    <div style={{ height: '32px' }} />
                </div>

                <IonToast"""
)

# 3. Replace section headers with Accordion wrappers
# Section 1: My Details
content = content.replace(
    """                    {/* ─ Personal Details ─ */}
                    <p className="acct-section-title">My Details</p>
                    <div className="acct-card">""",
    """                    {/* ─ Personal Details ─ */}
                    <IonAccordion value="details" style={{ background: 'transparent' }}>
                        <IonItem slot="header" lines="none" style={{ '--background': 'transparent', '--padding-start': '8px', '--inner-padding-end': '8px' }}>
                            <IonLabel className="acct-section-title" style={{ margin: '14px 0 10px' }}>My Details</IonLabel>
                        </IonItem>
                        <div slot="content" style={{ padding: '0 8px 10px' }}>
                            <div className="acct-card" style={{ margin: 0 }}>"""
)

# Close Personal Details and start Provider Settings
content = content.replace(
    """                    </IonButton>

                    {/* ─ Provider Settings ─ */""",
    """                    </IonButton>
                        </div>
                    </IonAccordion>

                    {/* ─ Provider Settings ─ */"""
)

# Section 2: Provider Settings
content = content.replace(
    """                            <p className="acct-section-title">Walker Settings</p>
                            <div className="acct-card">""",
    """                            <IonAccordion value="provider" style={{ background: 'transparent' }}>
                                <IonItem slot="header" lines="none" style={{ '--background': 'transparent', '--padding-start': '8px', '--inner-padding-end': '8px' }}>
                                    <IonLabel className="acct-section-title" style={{ margin: '14px 0 10px' }}>Walker Settings</IonLabel>
                                </IonItem>
                                <div slot="content" style={{ padding: '0 8px 10px' }}>
                                    <div className="acct-card" style={{ margin: 0 }}>"""
)

# Close Provider Settings
content = content.replace(
    """                            </IonButton>
                        </>
                    )}

                    {/* ─ My Dogs (owners only) ─ */""",
    """                            </IonButton>
                                </div>
                            </IonAccordion>
                        </>
                    )}

                    {/* ─ My Dogs (owners only) ─ */"""
)

# Section 3: My Dogs
content = content.replace(
    """                            <p className="acct-section-title">My Dogs</p>
                            <div className="acct-card">""",
    """                            <IonAccordion value="dogs" style={{ background: 'transparent' }}>
                                <IonItem slot="header" lines="none" style={{ '--background': 'transparent', '--padding-start': '8px', '--inner-padding-end': '8px' }}>
                                    <IonLabel className="acct-section-title" style={{ margin: '14px 0 10px' }}>My Dogs</IonLabel>
                                </IonItem>
                                <div slot="content" style={{ padding: '0 8px 10px' }}>
                                    <div className="acct-card" style={{ margin: 0 }}>"""
)

# Close My Dogs and start Add/Edit
content = content.replace(
    """                            </div>

                            {/* Add / Edit Dog Form */}
                            <p className="acct-section-title">{editingDogId ? 'Edit Dog Profile' : 'Add a Dog'}</p>
                            <div className="acct-card" style={{ padding: '16px' }}>""",
    """                            </div>

                            {/* Add / Edit Dog Form */}
                            <p className="acct-section-title" style={{ marginTop: '24px' }}>{editingDogId ? 'Edit Dog Profile' : 'Add a Dog'}</p>
                            <div className="acct-card" style={{ padding: '16px', margin: 0 }}>"""
)

# Close Add/Edit Dog
content = content.replace(
    """                            </div>
                        </>
                    )}

                    {/* ─ Sign Out ─ */""",
    """                            </div>
                                </div>
                            </IonAccordion>
                        </>
                    )}

                    {/* ─ Sign Out ─ */"""
)

with open(r"C:\Users\neilm\Documents\Pawsley\src\pages\Profile.tsx", "w", encoding="utf-8") as f:
    f.write(content)

print("Profile accordion conversion complete!")
